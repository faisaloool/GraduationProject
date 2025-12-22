using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using QuizAIDataBack;
using QuizAIDataBack;
using System;
using System.Collections.Generic;
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
            return await UserDataBack.CreateNewAccountAsync(NewUser);
        }

        public static async Task<UserLoginResponseDTO> Login(UserLoginRequestDTO loginInfo)
        {
            var userInfo = await UserDataBack.LoginAsync(loginInfo);

            if (userInfo == null)
                return null;

            var token = JwtServiceBusinessLayer.GenerateJwt(userInfo.Email);

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
                    string token = EmailServicesBusinessLayer.GenerateTokenForPasswordRecovery();
                    var u = await UserDataBack.GetUserByEmailAsync(forgotPasswordInfo.Email);
                    EmailServicesBusinessLayer.SendEmail(forgotPasswordInfo.Email, EmailServicesBusinessLayer.EmailMessageType.ForgotPassword, token);
                    await UserDataBack.SaveForgetPasswordInfoAsync(u.id, token);
                }
                catch { }
            }
        }

        public static async Task<int> UseForgotPasswordToken(string ForgotPasswordToken)
        {
            ResetPasswordTokenDTO tokenInfo = await UserDataBack.GetResetPasswordTokenInfoAsync(ForgotPasswordToken);
            if(tokenInfo != null && !tokenInfo.isUsed && tokenInfo.ExpiresAt > DateTime.UtcNow)
            {
                await UserDataBack.MarkForgotPasswordTokenAsUsed(tokenInfo.Token);
                return tokenInfo.UserID;
            }
            return -1;
        }

    }

    public static class JwtServiceBusinessLayer
    {
        private static string secretKey = "17+phKRQVRYD6uQRDj9nTmOQ4p003m3AfifPpbU3Fdn02eC6cW7miX4LV1/AJEc57u8wRK36XU27VxEqdO6OpQ==";

        public static string GenerateJwt(string email, int expireMinutes = 60)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Email, email)
                }),
                Expires = DateTime.UtcNow.AddMinutes(expireMinutes),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
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


    public class EmailServicesBusinessLayer
    {
        public enum EmailMessageType
        {
            ForgotPassword,
            VerifyEmail,
            Notification
        }

        public static string GenerateTokenForPasswordRecovery(int length = 6)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
              .Select(s => s[random.Next(s.Length)]).ToArray());
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
                        mail.Body =
                            $"We received a password reset request.\n\n" +
                            $"Your reset code is: {token}\n\n" +
                            $"If you didn’t request this, ignore this email.";
                        break;

                    case EmailMessageType.VerifyEmail:
                        mail.Subject = "Verify Your Email";
                        mail.Body =
                            $"Welcome!\n\nYour verification code is: {token}";
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
}

