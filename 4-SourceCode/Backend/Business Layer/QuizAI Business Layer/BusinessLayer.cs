using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using QuizAIDataBack;
using QuizAIDataBack;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace QuizAI_Business_Layer
{
    public class RegisterationBusinessLayer
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
}

