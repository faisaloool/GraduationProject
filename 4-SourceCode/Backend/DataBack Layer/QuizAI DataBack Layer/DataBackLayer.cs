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


namespace QuizAIDataBack
{
    public class UserDataBack
    {
        public static async Task<CreateNewUserResponseDTO> CreateNewAccountAsync(CreateNewUserRequestDTO UserInfo)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_CreateNewUser", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    byte[] Salt = Security.GenerateSalt();
                    byte[] hashedBytes = Security.HashData(UserInfo.Password, Salt);
                    string Password_Hashed = Convert.ToBase64String(hashedBytes);
                    cmd.Parameters.AddWithValue("@Email", UserInfo.Email);
                    cmd.Parameters.AddWithValue("@Password_Hashed", Password_Hashed);
                    cmd.Parameters.AddWithValue("@Name", UserInfo.Name);
                    cmd.Parameters.AddWithValue("@Salt", Salt);
                    cmd.Parameters.AddWithValue("@User_Role", "Student");
                    await con.OpenAsync();
                    var newUserId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                    //UserDTO u = new UserDTO { Email = UserInfo.Email, Name = UserInfo.Name, id = newUserId };
                    UserDTO u = new UserDTO(newUserId, UserInfo.Email, UserInfo.Name);
                    CreateNewUserResponseDTO User = new CreateNewUserResponseDTO(u);
                    return User;
                }
            }   
        }

        //public static async Task<int> DeleteAccountAsync(int UserID)
        //{
        //    using (SqlConnection con = new SqlConnection(Database._connectionString))
        //    {
        //        using (SqlCommand cmd = new SqlCommand("SP_DeleteUser", con))
        //        {
        //            cmd.CommandType = CommandType.StoredProcedure;
        //            cmd.Parameters.AddWithValue("@User_ID", UserID);

        //            await con.OpenAsync();
        //            await cmd.ExecuteNonQueryAsync();
        //        }
        //    }
        //    return UserID;
        //}


        public static async Task<UserDTO> LoginAsync(UserLoginRequestDTO loginInfo)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_HandleLogin", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Email", loginInfo.Email);

                    // Get the salt for the email
                    byte[] salt = await GetSaltAsync(loginInfo.Email);

                    if (salt != null)
                    {
                        string passwordHashed = Convert.ToBase64String(Security.HashData(loginInfo.Password, salt));
                        cmd.Parameters.AddWithValue("@Password_Hashed", passwordHashed);
                    }
                    else
                    {
                        return null; // email not found
                    }

                    await con.OpenAsync();

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            // return full user info
                            return new UserDTO(reader.GetInt32(reader.GetOrdinal("User_Id")), reader.GetString(reader.GetOrdinal("Email")), reader.GetString(reader.GetOrdinal("Name")));
                        }
                    }
                }
            }

            return null; // login failed
        }


        private static async Task<byte[]> GetSaltAsync(string Email)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserSaltViaEmail", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@Email", Email);
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();
                    if (result != null)
                        return (byte[])result;

                    return null;
                }
            }
        }
    }

    //public class ContentDataBack
    //{
    //    private static Dictionary<int, string> _cachedExtensions;

    //    public static async Task<Dictionary<int, string>> GetFileTypesAsync()
    //    {
    //        if (_cachedExtensions != null)
    //            return _cachedExtensions;

    //        Dictionary<int, string> ValidExtensions = new Dictionary<int, string>();

    //        using (SqlConnection con = new SqlConnection(Database._connectionString))
    //        using (SqlCommand cmd = new SqlCommand("SP_GetExtensions", con))
    //        {
    //            cmd.CommandType = CommandType.StoredProcedure;
    //            await con.OpenAsync();

    //            using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
    //            {
    //                while (reader.Read())
    //                {
    //                    int typeId = reader.GetInt32(reader.GetOrdinal("type_ID"));
    //                    string typeName = reader.GetString(reader.GetOrdinal("Type_Name"));
    //                    ValidExtensions.Add(typeId, typeName);
    //                }
    //            }
    //        }

    //        _cachedExtensions = ValidExtensions;
    //        return ValidExtensions;
    //    }
    //    public static async Task<ContentDTO> SaveContentAsync(ContentDTO ContentInfo)
    //    {
    //        using (SqlConnection con = new SqlConnection(Database._connectionString))
    //        {
    //            using (SqlCommand cmd = new SqlCommand("SP_AddNewContent", con))
    //            {
    //                cmd.CommandType = CommandType.StoredProcedure;
    //                await con.OpenAsync();

    //                cmd.Parameters.AddWithValue("@User_ID", ContentInfo.UserID);
    //                cmd.Parameters.AddWithValue("@File_Type", ContentInfo.FileType);
    //                cmd.Parameters.AddWithValue("@File_Path", ContentInfo.FilePath);
    //                cmd.Parameters.AddWithValue("@Extracted_Text", ContentInfo.ExtractedText);

    //                await cmd.ExecuteNonQueryAsync();
    //            }
    //        }
    //        return ContentInfo;
    //    }




    //}





















}
