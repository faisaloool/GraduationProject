using Microsoft.IdentityModel.Tokens;
using QuizAI_DataBack_Layer;
using QuizAI_DataBack_Layer;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace QuizAI_Business_Layer
{
    public class QuizAIBL
    {
        public static async Task<UserDTO> RegisterNewUser(QuizAI_DataBack_Layer.UserDTO NewUser)
        {
            return await DataBack.CreateNewAccountAsync(NewUser);
        }
        public static async Task<bool> Login(UserLoginDTO LoginInfo)
        {
            return await DataBack.LoginAsync(LoginInfo);
        }

    }


    public static class JwtService
    {
        private static string secretKey = "17+phKRQVRYD6uQRDj9nTmOQ4p003m3AfifPpbU3Fdn02eC6cW7miX4LV1/AJEc57u8wRK36XU27VxEqdO6OpQ==";

        public static string GenerateJwt(string email, string userRole, int expireMinutes = 60)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, userRole)
                }),
                Expires = DateTime.UtcNow.AddMinutes(expireMinutes),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

}

//17+phKRQVRYD6uQRDj9nTmOQ4p003m3AfifPpbU3Fdn02eC6cW7miX4LV1/AJEc57u8wRK36XU27VxEqdO6OpQ==