using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;


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

                    object result = await cmd.ExecuteScalarAsync();
                    Guid newUserId = (result != null) ? Guid.Parse(result.ToString()) : Guid.Empty;

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
                    byte[] salt = await GetSaltByEmailAsync(loginInfo.Email);

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
                            // Read User_Id as GUID now
                            Guid userId = reader.GetGuid(reader.GetOrdinal("User_Id"));
                            string email = reader.GetString(reader.GetOrdinal("Email"));
                            string name = reader.GetString(reader.GetOrdinal("Name"));

                            // Return full user info
                            return new UserDTO(userId, email, name);
                        }
                    }

                }
            }

            return null; // login failed
        }

        private static async Task<byte[]> GetSaltByEmailAsync(string Email)
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

        private static async Task<byte[]> GetSaltByUserIDAsync(Guid id)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserSaltViaUserID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add("@User_ID", SqlDbType.UniqueIdentifier).Value = id;
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();
                    if (result != null)
                        return (byte[])result;

                    return null;

                }
            }
        }


        public static async Task<bool> CheckEmailExistsAsync(ForgotPasswordRequestDTO ForgotPasswordInfo)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_CheckUserExists", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Email", ForgotPasswordInfo.Email);
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();
                    if (result != null)
                        return Convert.ToBoolean(result);
                    return false;
                }
            }
        }

        public static async Task SaveForgetPasswordInfoAsync(Guid id, string token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_SaveResetPasswordToken", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@User_Id", id);
                    cmd.Parameters.AddWithValue("@Token", token);

                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }


        public static async Task<UserDTO> GetUserByEmailAsync(string Email)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserByEmail", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Email", Email);
                    await con.OpenAsync();
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new UserDTO(
                                reader.GetGuid(reader.GetOrdinal("User_Id")),
                                reader.GetString(reader.GetOrdinal("Email")),
                                reader.GetString(reader.GetOrdinal("Name"))
                            );
                        }
                    }
                }
            }
            return null;
        }


        public static async Task<UserDTO> GetUserByUserIDAsync(Guid id)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserByUserID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@User_ID", id);
                    await con.OpenAsync();
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            Guid userId = reader.GetGuid(reader.GetOrdinal("User_ID"));
                            string email = reader.GetString(reader.GetOrdinal("Email"));
                            string name = reader.GetString(reader.GetOrdinal("Name"));

                            return new UserDTO(userId, email, name);
                        }
                    }
                }
            }
            return null;
        }



        public static async Task MarkForgotPasswordTokenAsUsed(string token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_UseResetPasswordToken", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Token", token);
                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }


        public static async Task<ResetPasswordTokenDTO> GetResetPasswordTokenInfoAsync(string token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetforgetPasswordTokenInfo", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Token", token);
                    await con.OpenAsync();
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new ResetPasswordTokenDTO(
                                reader.GetGuid(reader.GetOrdinal("Id")),
                                reader.GetGuid(reader.GetOrdinal("User_ID")),
                                reader.GetString(reader.GetOrdinal("Token")),
                                reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                                reader.GetDateTime(reader.GetOrdinal("ExpiresAt")),
                                reader.GetBoolean(reader.GetOrdinal("IsUsed"))
                            );
                        }
                    }
                }
            }
            return null;
        }

        public static async Task ResetPasswordAsync(Guid id, string NewPassword)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_ResetUserPassword", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@User_ID", id);

                    byte[] salt = await GetSaltByUserIDAsync(id);
                    if (salt != null)
                    {
                        byte[] hashBytes = Security.HashData(NewPassword, salt);
                        string base64Hash = Convert.ToBase64String(hashBytes);
                        cmd.Parameters.AddWithValue("@NewPassword", base64Hash);
                    }

                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
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

    public class QuizzesDataBack
    {
        public static async Task<QuizResponseDTO> GetQuizzesByUserIDAsync(Guid UserID)
        {
            QuizResponseDTO QuizzesInfo = new QuizResponseDTO();

            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetUserQuizzesByUserID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@User_ID", UserID);
                    await con.OpenAsync();
                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        while (reader.Read())
                        {
                            QuizzesInfo.QuizzesInfo.Add(new QuizDTO(
                                reader.GetGuid(reader.GetOrdinal("Quiz_ID")),
                                reader.GetString(reader.GetOrdinal("Quiz_Title"))
                            ));
                        }
                    }
                }
            }
            return QuizzesInfo;
        }


        public static async Task<bool> DeleteQuizAsync(Guid QuizID, Guid UserID)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_DeleteQuizUsingQuizID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Quiz_ID", QuizID);
                    cmd.Parameters.AddWithValue("@User_ID", UserID);
                    await con.OpenAsync();
                    object result = await cmd.ExecuteScalarAsync();

                    if (result != null)
                    {
                        return Convert.ToBoolean(result);
                    }
                    return false;
                }
            }
        }


        public static async Task<bool> RenameQuizAsync(Guid QuizID, Guid UserID, string NewName)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_RenameQuizUsingQuizID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@User_ID", UserID);
                    cmd.Parameters.AddWithValue("@Quiz_ID", QuizID);
                    cmd.Parameters.AddWithValue("@Quiz_Name", NewName);
                    await con.OpenAsync();
                    
                    object result = await cmd.ExecuteScalarAsync();

                    if (result != null)
                    {
                        return Convert.ToBoolean(result);
                    }
                    return false;
                }
            }
        }

        public static async Task ShareQuizAsync(Guid RecipientUserID, Guid QuizID)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_ShareQuiz", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Quiz_ID", QuizID);
                    cmd.Parameters.AddWithValue("@Recipient_User_ID", RecipientUserID);
                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
                }
            }

        }

    }















}
