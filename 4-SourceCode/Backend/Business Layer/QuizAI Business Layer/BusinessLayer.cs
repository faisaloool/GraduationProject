using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using QuizAIDataBack;
using System;
using System.Collections.Generic;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace QuizAI_Business_Layer
{
    public class UserBusinessLayer
    {
        public static async Task<CreateNewUserResponseDTO> RegisterNewUser(CreateNewUserRequestDTO NewUser)
        {
            string token = TokensBusinessLayer.GenerateTokenForEmailVerification();

            EmailServicesBusinessLayer.SendEmail(NewUser.Email, EmailServicesBusinessLayer.EmailMessageType.VerifyEmail, token);
            CreateNewUserResponseDTO user = await UserDataBack.CreateNewAccountAsync(NewUser);
            
            await UserDataBack.SaveVerifyEmailTokenAsync(user.user.id, token);

            return user;
        }

        public static async Task<bool> VerifyNewUser(Guid UserID, string token)
        {
            return await UserDataBack.VerifyNewUserEmailAsync(UserID, token);
        }

        public static async Task<UserLoginResponseDTO> Login(UserLoginRequestDTO loginInfo)
        {
            var userInfo = await UserDataBack.LoginAsync(loginInfo);

            if (userInfo == null)
                return null;

            var token = JwtServiceBusinessLayer.GenerateJwt(userInfo.id, userInfo.Email);

            return new UserLoginResponseDTO
            {
                user = userInfo,
                token = token
            };
        }

        public static async Task ForgotPassword(ForgotPasswordRequestDTO forgotPasswordInfo)
        {
            if (UserDataBack.CheckEmailExistsAsync(forgotPasswordInfo).Result)
            {
                try
                {
                    string token = TokensBusinessLayer.GenerateTokenForPasswordRecovery();
                    var u = await UserDataBack.GetUserByEmailAsync(forgotPasswordInfo.Email);
                    EmailServicesBusinessLayer.SendEmail(forgotPasswordInfo.Email, EmailServicesBusinessLayer.EmailMessageType.ForgotPassword, token);
                    await UserDataBack.SaveForgetPasswordInfoAsync(u.id, token);
                }
                catch { }
            }
        }

        public static async Task<Guid?> UseForgotPasswordToken(string ForgotPasswordToken)
        {
            ResetPasswordTokenDTO tokenInfo = await UserDataBack.GetResetPasswordTokenInfoAsync(ForgotPasswordToken);
            if(tokenInfo != null && !tokenInfo.isUsed && tokenInfo.ExpiresAt > DateTime.UtcNow)
            {
                await UserDataBack.MarkForgotPasswordTokenAsUsed(tokenInfo.Token);
                return tokenInfo.UserID;
            }
            return Guid.Empty;
        }

        public static async Task<bool> ResetUserPassword(Guid id, string newPassword)
        {
            if (Security.IsValidPassword(newPassword))
            {
                UserDTO user = await UserDataBack.GetUserByUserIDAsync(id);
                if (user != null)
                {
                    await UserDataBack.ResetPasswordAsync(id, newPassword);
                    return true;
                }
            }
            return false;
        }
    }

    public static class JwtServiceBusinessLayer
    {
        private static string secretKey = "17+phKRQVRYD6uQRDj9nTmOQ4p003m3AfifPpbU3Fdn02eC6cW7miX4LV1/AJEc57u8wRK36XU27VxEqdO6OpQ==";

        public static string GenerateJwt(Guid userId, string email, int expireMinutes = 60000)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email)
            };

            var now = DateTime.UtcNow;

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = now.AddMinutes(expireMinutes),
                NotBefore = now,
                IssuedAt = now,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };


            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

    }
    public class ContentBusinessLayer
    {
        public static async Task<Dictionary<int, string>> GetFileTypes()
        {
            return await QuizAIDataBack.ContentDataBack.GetFileTypesAsync();
        }
        public static async Task<contentResponseDTO> SaveUploadedFile(IFormFile file, Guid userId, string saveDirectory = "C:\\Users\\albab\\OneDrive - Mutah University\\UploadedContent")
        {
            contentResponseDTO contentInfoResponse = new contentResponseDTO();

            if (file == null || file.Length == 0)
                throw new ArgumentException("No file uploaded.");

            var ext = Path.GetExtension(file.FileName).ToLower();

            var allowed = await GetFileTypes();
            if (!allowed.Values.Contains(ext))
                throw new ArgumentException("Unsupported file type.");

            // Ensure directory exists
            if (!Directory.Exists(saveDirectory))
                Directory.CreateDirectory(saveDirectory);

            //var filePath = Path.Combine(saveDirectory, file.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(saveDirectory, uniqueFileName);


            // Save file to disk ONLY
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return info without saving to DB
            contentInfoResponse.path = filePath;
            contentInfoResponse.ContentID = Guid.NewGuid(); // optional placeholder ID if needed

            return contentInfoResponse;
        }
        
        public static bool DeleteFile(string filePath)
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                return true;
            }
            return false;
        }
    
    }

    public class ServerHealthBusinessLayer
    {
        public static async Task<bool> CheckDbConnection()
        {
            return await Database.IsDbConnectedAsync();
        }

        public static bool IsDiskSpaceOk(string driveLetter = "C")
        {
            try
            {
                DriveInfo drive = new DriveInfo(driveLetter);

                long freeBytes = drive.AvailableFreeSpace;

                // 250 MB in bytes
                long requiredBytes = 250L * 1024 * 1024;

                return freeBytes >= requiredBytes;
            }
            catch
            {
                // If drive not found or error occurs
                return false;
            }
        }
    }

    public class TokensBusinessLayer
    {
        const string ResetPasswordTokenChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const string VerifyEmailTokenChars = "1234567890";
        const string ShareQuizTokenChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        public static string GenerateTokenForPasswordRecovery(int length = 6)
        {
            var random = new Random();
            return new string(Enumerable.Repeat(ResetPasswordTokenChars, length)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public static string GenerateTokenForEmailVerification(int length = 6)
        {
            var random = new Random();
            return new string(Enumerable.Repeat(VerifyEmailTokenChars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public static string GenerateTokenForShareQuiz(int length = 6)
        {
            var random = new Random();
            return new string(Enumerable.Repeat(ShareQuizTokenChars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }

    public class EmailServicesBusinessLayer
    {
        public enum EmailMessageType
        {
            ForgotPassword,
            VerifyEmail,
            Notification
        }

        public static void SendEmail(string emailTo, EmailMessageType messageType, string token = null)
        {
            try
            {
                MailMessage mail = new MailMessage();
                SmtpClient smtp = new SmtpClient("smtp.gmail.com");

                mail.From = new MailAddress("legaledge81@gmail.com", "QuizAI");
                mail.To.Add(emailTo);

                switch (messageType)
                {
                    case EmailMessageType.ForgotPassword:
                        mail.Subject = "Reset Your Password";

                    
                        var resetPasswordLink = $"https://quiz-ai-01.netlify.app/change-password/{token}";

                        mail.Body =
                            "Hello,\n\n" +
                            "We received a request to reset the password for your Quiz AI account.\n\n" +
                            "To reset your password, please click the link below:\n\n" +
                            $"{resetPasswordLink}\n\n" +
                            "This link is valid for a limited time and can only be used once.\n\n" +
                            "If you did not request this, please ignore this email and no changes will be made.\n\n" +
                            "Best regards,\n" +
                            "Quiz AI Team";
                    break;
                        
                    case EmailMessageType.VerifyEmail:
                        mail.Subject = "Verify Your Email Address";

                        mail.Body =
                            "Hello,\n\n" +
                            "Thank you for registering with Quiz AI.\n\n" +
                            "To complete your registration, please verify your email address using the verification code below:\n\n" +
                            $"Verification Code: {token}\n\n" +
                            "Enter this code on our website to confirm your email address and activate your account.\n\n" +
                            "If you did not create an account with us, please ignore this email. No further action is required.\n\n" +
                            "Best regards,\n" +
                            "Quiz AI Team";

                    break;


                    case EmailMessageType.Notification:
                        mail.Subject = "Notification";
                        mail.Body = token; // reuse token as message
                        break;
                }

                smtp.Port = 587;
                smtp.Credentials = new NetworkCredential(
                    "legaledge81@gmail.com",
                    "bqff aldw psaz jptl"
                );
                smtp.EnableSsl = true;

                smtp.Send(mail);
            }
            catch
            {
                
            }
        }
    }

    public class QuizzesBusinessLayer
    {
        public static async Task<QuizResponseDTO> GetQuizzesByUserID(Guid UserID)
        {
            return await QuizzesDataBack.GetQuizzesByUserIDAsync(UserID);
        }

        public static async Task<bool> DeleteQuizUsingQuizID(Guid QuizID, Guid UserID)
        {
            string FilePath = await GetFilePath(QuizID);

            ContentBusinessLayer.DeleteFile(FilePath);
            return await QuizzesDataBack.DeleteQuizAsync(QuizID, UserID);
        }

        public static async Task<bool> RenameQuiz(Guid QuizID, Guid UserID, string NewName)
        {
            return await QuizzesDataBack.RenameQuizAsync(QuizID, UserID, NewName);
        }

        public static async Task<bool> ShareQuiz(Guid RecipientUserID, string Token)
        {
            return await QuizzesDataBack.ShareQuizAsync(RecipientUserID, Token);
        }

        public static async Task<string> CreateShareQuizToken(Guid QuizID)
        {
            string Token = TokensBusinessLayer.GenerateTokenForShareQuiz();

            await QuizzesDataBack.CreateShareTokenAsync(QuizID, Token);
            return Token;
        }

        public static async Task<Quiz> GetQuizQuestionsBasedOnQuizID(Guid QuizID, string QuizTitle)
        {
            return await QuizzesDataBack.GetQuizBasedOnQuizIDAsync(QuizID, QuizTitle);
        }

        public static async Task<bool> DeleteQuestionUsingQuestionID(Guid QuestionID, Guid QuizID, Guid UserID)
        {
            return await QuizzesDataBack.DeleteQuestionUsingQuestionID(QuestionID, QuizID, UserID);
        }
        //added quiz id.
        public static async Task<GenerateQuizResponseDTO> GenerateQuiz(Guid UserID, GenerateQuizRequestDTO request, IFormFile file, byte GenerateFlag, string existingFilePath = null, Guid? QuizID = null)
        {
            using var client = new HttpClient();
            client.BaseAddress = new Uri("http://127.0.0.1:8001/");

            using var content = new MultipartFormDataContent();

            // --- STEP 1: Attach the File ---
            if (GenerateFlag == 1 && file != null && file.Length > 0)
            {
                // Path A: New upload from the user
                var stream = file.OpenReadStream();
                var fileContent = new StreamContent(stream);
                var contentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType;
                fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
                content.Add(fileContent, "file", file.FileName);
            }
            else if (GenerateFlag == 0 && !string.IsNullOrEmpty(existingFilePath))
            {
                // Path B: Regeneration - Load existing file from disk
                if (File.Exists(existingFilePath))
                {
                    var fileBytes = await File.ReadAllBytesAsync(existingFilePath);
                    var fileContent = new ByteArrayContent(fileBytes);

                    // Set Content-Type (AI models usually expect application/pdf or text/plain)
                    string mimeType = "application/octet-stream";
                    if (existingFilePath.EndsWith(".pdf")) mimeType = "application/pdf";
                    else if (existingFilePath.EndsWith(".txt")) mimeType = "text/plain";

                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
                    content.Add(fileContent, "file", Path.GetFileName(existingFilePath));
                }
                else
                {
                    throw new FileNotFoundException($"Could not find the original file at {existingFilePath} for regeneration.");
                }
            }

            // --- STEP 2: Call AI Model ---
            string url = $"ask_ai_model?mcq_count={request.MCQCount}&tf_count={request.TFCount}";
            HttpResponseMessage response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                // Capture the error message from the AI API for easier debugging
                string errorDetails = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Model Error ({response.StatusCode}): {errorDetails}");
            }

            string jsonString = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            QuestionResponse? result = JsonSerializer.Deserialize<QuestionResponse>(jsonString, options);

            if (result == null)
                throw new Exception("Failed to deserialize the response from AI model.");

            // --- STEP 3: Handle Database & Disk Persistence ---
            string savedFilePath = existingFilePath; // Default to existing path if regenerating

            if (GenerateFlag == 1 && file != null && file.Length > 0)
            {
                // Only save to disk if this is a brand new generation
                contentResponseDTO uploadedContent = await ContentBusinessLayer.SaveUploadedFile(file, UserID);
                savedFilePath = uploadedContent.path;
            }

            // Save/Update the record in your database

            GenerateQuizResponseDTO FinalResponse;
            if(GenerateFlag == 0)
            {
                FinalResponse = await QuizzesDataBack.SaveQuizInfoToDataBaseAsync(UserID, result, savedFilePath, GenerateFlag, QuizID);
            }
            else
            {
                FinalResponse = await QuizzesDataBack.SaveQuizInfoToDataBaseAsync(UserID, result, savedFilePath, GenerateFlag);
            }
            
            return FinalResponse;
        }



        public static async Task<QuizQuestion?> RegenerateSingleQuestion(Guid QuestionID, string existingFilePath, Guid QuizID, Guid UserID, string QuestionType)
        {
            bool isDeleted = await QuizzesBusinessLayer.DeleteQuestionUsingQuestionID(QuestionID, QuizID, UserID);

            if (!isDeleted)
                return null;

            using var client = new HttpClient
            {
                BaseAddress = new Uri("http://127.0.0.1:8001/")
            };

            using var content = new MultipartFormDataContent();

            var fileBytes = await File.ReadAllBytesAsync(existingFilePath);
            var fileContent = new ByteArrayContent(fileBytes);

            string mimeType = existingFilePath.EndsWith(".pdf")
                ? "application/pdf"
                : "text/plain";

            fileContent.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);

            content.Add(fileContent, "file", Path.GetFileName(existingFilePath));

            int mcq = QuestionType.ToLower() == "mcq" ? 1 : 0;
            int tf = QuestionType.ToLower() == "tf" ? 1 : 0;

            string url = $"ask_ai_model?mcq_count={mcq}&tf_count={tf}";
            HttpResponseMessage response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
                return null;

            string jsonString = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            QuestionResponse? regeneratedQuestion =
                JsonSerializer.Deserialize<QuestionResponse>(jsonString, options);

            if (regeneratedQuestion == null)
                return null;

            Guid newQuestionID = Guid.NewGuid();

            QuizQuestion savedQuestion = await QuizzesDataBack.SaveRegeneratedQuestionToDatabaseAsync(QuizID, newQuestionID, QuestionType.ToUpper(), regeneratedQuestion);

            return savedQuestion;
        }

        public static async Task<string> GetFilePath(Guid QuizID)
        {
            return await QuizzesDataBack.GetQuizFilePathAsync(QuizID);
        }

        public static async Task<bool> SubmitQuizAttempt(Guid userId, Guid quizId, List<AnswerDto> answers)
        {
            try
            {
                // 1. Logic check: Ensure the list isn't empty before hitting the DB
                if (answers == null || answers.Count == 0)
                {
                    return false;
                }

                // 2. Transform the list into the specific JSON format the SP expects
                // Format: { "answers": [...] }
                string serializedAnswers = JsonSerializer.Serialize(answers);

                // 3. Call the Data Access Layer function
                // (Assuming 'QuizRepository' is where the previous function lives)
                bool isSuccess = await QuizzesDataBack.HandleSubmit(userId, quizId, serializedAnswers);

                return isSuccess;
            }
            catch (Exception)
            {
                // Log exception here if needed
                return false;
            }
        }
    }

}


