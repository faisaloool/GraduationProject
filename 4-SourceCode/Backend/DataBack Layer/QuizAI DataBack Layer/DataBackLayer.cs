using System;
using System.Collections.Generic;
using System.Data;
using System.Net;
using System.Net.Mail;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;


namespace QuizAI_DataBack_Layer
{
    public class UserDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        [Required]

        public string Password { get; set; }
        [Required]

        public string FullName { get; set; }
        [Required]

        public string UserRole { get; set; }
        public UserDTO(string Email, string Password, string FullName, string UserRole)
        {
            this.Email = Email;
            this.Password = Password;
            this.FullName = FullName;
            this.UserRole = UserRole;
        }

    }

    public class UserLoginDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        [Required]
        public string Password { get; set; }
        public UserLoginDTO(string Email, string Password)
        {
            this.Email= Email;
            this.Password= Password;
        }
    }


    public class DataBack
    {
        public static async Task<UserDTO> CreateNewAccountAsync(UserDTO UserInfo)
        {
            using (SqlConnection con = new SqlConnection(Module._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_CreateNewUser", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    byte[] Salt = Module.GenerateSalt();
                    byte[] hashedBytes = Module.HashData(UserInfo.Password, Salt);
                    string Password_Hashed = Convert.ToBase64String(hashedBytes);
                    // Add parameters from your UserDTO object
                    cmd.Parameters.AddWithValue("@Email", UserInfo.Email);
                    cmd.Parameters.AddWithValue("@Password_Hashed", Password_Hashed);
                    cmd.Parameters.AddWithValue("@Name", UserInfo.FullName);
                    cmd.Parameters.AddWithValue("@Salt", Salt);
                    cmd.Parameters.AddWithValue("@User_Role", UserInfo.UserRole);

                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync(); // since the SP only inserts, no reader needed
                }
            }

            // Optionally, return the same object or null depending on your logic
            return UserInfo;
        }
        
        public static async Task<bool> LoginAsync(UserLoginDTO loginInfo)//3//5//7
        {
            using (SqlConnection con = new SqlConnection(Module._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_HandleLogin", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Email", loginInfo.Email);
                    byte[] salt = await GetSaltAsync(loginInfo.Email);

                    if (salt != null)
                    {
                        string Password_Hashed = Convert.ToBase64String(Module.HashData(loginInfo.Password, salt));

                        cmd.Parameters.AddWithValue("@Password_Hashed", Password_Hashed);
                    }
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();
                    if(result != null)
                    {
                        int intResult = Convert.ToInt32(result);
                        if (intResult == 1)
                        {
                            return true;
                        }
                    }
                    
                }
            }
            return false;
        }

        private static async Task<byte[]> GetSaltAsync(string Email)//4
        {
            using (SqlConnection con = new SqlConnection(Module._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserSaltViaEmail", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@Email", Email);
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();
                    if(result != null)
                        return (byte[])result;
                    
                    return null;
                }

            }
        }



    }
}
