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

        public static string GenerateJwt(Guid userId, string email, int expireMinutes = 60)
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

    //public class ContentBusinessLayer
    //{
    //    public static async Task<Dictionary<int, string>> GetFileTypes()
    //    {
    //        return await QuizAIDataBack.ContentDataBack.GetFileTypesAsync();
    //    }

    //    public static async Task<ContentDTO> SaveContent(ContentDTO ContentInfo, IFormFile file)
    //    {
    //        using (var stream = new FileStream(ContentInfo.FilePath, FileMode.Create))
    //            await file.CopyToAsync(stream);

    //        return await ContentDataBack.SaveContentAsync(ContentInfo);
    //    }
    //}
   
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
                        var resetPasswordLink = $"http://localhost:5173/change-password/{token}";

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
    }
}

