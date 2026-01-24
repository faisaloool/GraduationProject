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

        public static async Task<bool> SaveVerifyEmailTokenAsync(Guid UserID, string Token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_SaveVerifyEmailToken", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    
                    cmd.Parameters.AddWithValue("@UserID", UserID);
                    cmd.Parameters.AddWithValue("@Token", Token);
                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
                    return true;
                }
            }
        }

        public static async Task<bool> VerifyNewUserEmailAsync(Guid UserID, string Token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_UseVerifyEmailToken", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@UserID", UserID);
                    cmd.Parameters.AddWithValue("@Token", Token);

                    await con.OpenAsync();

                    object result = await cmd.ExecuteScalarAsync();

                    if (Convert.ToBoolean(result))
                    {
                        return true;
                    }
                }
            }

            return false;
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

                    byte[] salt = await GetSaltByEmailAsync(loginInfo.Email);

                    if (salt != null)
                    {
                        string passwordHashed = Convert.ToBase64String(Security.HashData(loginInfo.Password, salt));
                        cmd.Parameters.AddWithValue("@Password_Hashed", passwordHashed);
                    }
                    else
                    {
                        return null;
                    }

                    await con.OpenAsync();

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            Guid userId = reader.GetGuid(reader.GetOrdinal("User_Id"));
                            string email = reader.GetString(reader.GetOrdinal("Email"));
                            string name = reader.GetString(reader.GetOrdinal("Name"));

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

        public static async Task CreateShareTokenAsync(Guid QuizID, string Token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_SaveShareQuizToken", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Quiz_ID", QuizID);
                    cmd.Parameters.AddWithValue("@Token", Token);

                    await con.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        public static async Task<bool> ShareQuizAsync(Guid RecipientUserID, string Token)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_ShareQuiz", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Token", Token);
                    cmd.Parameters.AddWithValue("@Recipient_User_ID", RecipientUserID);
                    await con.OpenAsync();
                    var result = await cmd.ExecuteScalarAsync();

                    if (Convert.ToBoolean(result))
                    {
                        return true;
                    }
                    return false;
                }
            }
        }

        public static async Task<Quiz> GetQuizBasedOnQuizIDAsync(Guid QuizID, string QuizTitle)
        {
            Quiz quizInfo = new Quiz();
            quizInfo.QuizID = QuizID;
            quizInfo.Title = QuizTitle;
            quizInfo.Questions = new List<QuizQuestion>(); // Ensure it's initialized

            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                await con.OpenAsync();
                using (SqlCommand cmd = new SqlCommand("SP_GetQuestionsBasedOnQuizID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Quiz_ID", QuizID);

                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        // 1️⃣ Quiz info
                        if (await reader.ReadAsync())
                        {
                            result.QuizID = reader.GetGuid(reader.GetOrdinal("Quiz_ID"));
                            result.QuizTitle = reader.GetString(reader.GetOrdinal("Quiz_Title"));
                        }

                        // 2️⃣ Questions
                        var questionsDict = new Dictionary<Guid, QuizQuestion>();

                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                Guid qId = reader.GetGuid(reader.GetOrdinal("Question_ID"));

                                var question = new QuizQuestion
                                {
                                    QuestionID = qId,
                                    QuestionContent = reader.GetString(reader.GetOrdinal("Question_Content")),
                                    SuggestedAnswer = reader.GetString(reader.GetOrdinal("Suggested_Answer")),
                                    choices = new List<MCQChoice>()
                                };

                                questionsDict[qId] = question;
                                result.Questions.Add(question);
                            }
                        }

                        // 3️⃣ MCQ Choices
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                Guid questionId = reader.GetGuid(reader.GetOrdinal("Question_ID"));

                                if (questionsDict.TryGetValue(questionId, out var question))
                                {
                                    question.choices.Add(new MCQChoice
                                    {
                                        ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                        Question_ID = questionId,
                                        Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                    });
                                }
                            }
                        }

                        // 4️⃣ True / False Choices (WITH Choice_ID)
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                Guid questionId = reader.GetGuid(reader.GetOrdinal("Question_ID"));

                                if (questionsDict.TryGetValue(questionId, out var question))
                                {
                                    question.choices.Add(new MCQChoice
                                    {
                                        ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                        Question_ID = questionId,
                                        Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                    });
                                }
                            }
                        }
                    }

                }
            }

            return quizInfo;
        }

        public static async Task<bool> DeleteQuestionUsingQuestionID(Guid QuestionID, Guid QuizID, Guid UserID)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_DeleteQuestionBasedOnQuestionID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Question_ID", QuestionID);
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
        /*
         
        Quiz Title.
        User ID.

        File Type: 
        1. .mp3
        2. .wav
        3. .mp4
        4. .mov
        5. .mkv
        6. .avi
        7. .pdf
        8. .docx
        9. .doc
        10. .pptx
        11. .ppt
        12. .txt

        File path.



         */

        public static async Task<GenerateQuizResponseDTO> SaveQuizInfoToDataBaseAsync(Guid userID, QuestionResponse QuizInfo, string FilePath, byte GenerateFlag, Guid? QuizID = null)
        {
            GenerateQuizResponseDTO result = new GenerateQuizResponseDTO();

            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_SaveGeneratedQuiz", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // --- Basic info ---
                    cmd.Parameters.AddWithValue("@UserID", userID);
                    cmd.Parameters.AddWithValue("@QuizTitle", QuizInfo.filename ?? "Generated Quiz");


                    // --- File info ---
                    string extension = System.IO.Path.GetExtension(QuizInfo.filename) ?? ".unknown";
                    int fileTypeID = Database.SelectFileType(extension);

                    cmd.Parameters.AddWithValue("@FileType", fileTypeID);
                    cmd.Parameters.AddWithValue("@FilePath", FilePath);

                    // --- Serialize full quiz JSON ---
                    string jsonBody = System.Text.Json.JsonSerializer.Serialize(QuizInfo);
                    cmd.Parameters.AddWithValue("@QuestionsJson", jsonBody);


                    if (GenerateFlag == 0)
                    {
                        cmd.Parameters.AddWithValue("@QuizID", QuizID);
                    }
                    else if (GenerateFlag == 1)
                    {
                        cmd.Parameters.AddWithValue("@QuizID", Guid.NewGuid());
                    }

                        await con.OpenAsync();

                    // --- Execute SP and read back generated QuizID ---
                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        // 1️⃣ Quiz info
                        if (await reader.ReadAsync())
                        {
                            result.QuizID = reader.GetGuid(reader.GetOrdinal("Quiz_ID"));
                            result.QuizTitle = reader.GetString(reader.GetOrdinal("Quiz_Title"));
                        }

                        // 2️⃣ Questions (MCQ + TF)
                        if (await reader.NextResultAsync())
                        {
                            result.Questions = new List<QuizQuestion>();

                            while (await reader.ReadAsync())
                            {
                                result.Questions.Add(new QuizQuestion
                                {
                                    QuestionID = reader.GetGuid(reader.GetOrdinal("Question_ID")),
                                    QuestionContent = reader.GetString(reader.GetOrdinal("Question_Content")),
                                    SuggestedAnswer = reader.GetString(reader.GetOrdinal("Suggested_Answer")),
                                    choices = new List<MCQChoice>() // always initialize
                                });
                            }
                        }

                        // 3️⃣ MCQ Choices
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                Guid questionId = reader.GetGuid(reader.GetOrdinal("Question_ID"));

                                var question = result.Questions
                                    .FirstOrDefault(q => q.QuestionID == questionId);

                                if (question != null)
                                {
                                    question.choices.Add(new MCQChoice
                                    {
                                        ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                        Question_ID = questionId,
                                        Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                    });
                                }
                            }
                        }

                        // 4️⃣ True / False Choices (WITH Choice_ID)
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                Guid questionId = reader.GetGuid(reader.GetOrdinal("Question_ID"));

                                var question = result.Questions
                                    .FirstOrDefault(q => q.QuestionID == questionId);

                                if (question != null)
                                {
                                    question.choices.Add(new MCQChoice
                                    {
                                        ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                        Question_ID = questionId,
                                        Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                    });
                                }
                            }
                        }
                    }


                }
            }

            return result;
        }


        public static async Task<string> GetQuizFilePathAsync(Guid QuizID)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_GetContentPathBasedOnQuizID", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@QuizID", QuizID);
                    await con.OpenAsync();
                    object? result = await cmd.ExecuteScalarAsync();
                    string filePath = result?.ToString() ?? string.Empty;

                    return filePath;
                }
            }
        }

        public static async Task<QuizQuestion> SaveRegeneratedQuestionToDatabaseAsync(Guid quizID, Guid questionID, string questionType, QuestionResponse regeneratedQuestionJson)
        {
            QuizQuestion result = null;

            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_SaveRegeneratedQuestion", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // --- Required params ---
                    cmd.Parameters.AddWithValue("@QuizID", quizID);
                    cmd.Parameters.AddWithValue("@QuestionID", questionID);
                    cmd.Parameters.AddWithValue("@QuestionType", questionType);

                    // --- Serialize JSON (same format as before) ---
                    string jsonBody = System.Text.Json.JsonSerializer.Serialize(regeneratedQuestionJson);
                    cmd.Parameters.AddWithValue("@QuestionJson", jsonBody);

                    await con.OpenAsync();

                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        // 1️⃣ Question
                        if (await reader.ReadAsync())
                        {
                            result = new QuizQuestion
                            {
                                QuestionID = reader.GetGuid(reader.GetOrdinal("Question_ID")),
                                QuestionContent = reader.GetString(reader.GetOrdinal("Question_Content")),
                                SuggestedAnswer = reader.GetString(reader.GetOrdinal("Suggested_Answer")),
                                choices = new List<MCQChoice>()
                            };
                        }

                        // 2️⃣ MCQ Choices
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                result?.choices.Add(new MCQChoice
                                {
                                    ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                    Question_ID = result.QuestionID,
                                    Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                });
                            }
                        }

                        // 3️⃣ True / False Choices
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                result?.choices.Add(new MCQChoice
                                {
                                    ChoiceID = reader.GetGuid(reader.GetOrdinal("Choice_ID")),
                                    Question_ID = result.QuestionID,
                                    Choice = reader.GetString(reader.GetOrdinal("Choice_Text"))
                                });
                            }
                        }
                    }

                }
            }

            return result;
        }



        public static async Task<bool> HandleSubmit(Guid UserID, Guid QuizID, string JsonInput)
        {
            using (SqlConnection con = new SqlConnection(Database._connectionString))
            {
                using (SqlCommand cmd = new SqlCommand("SP_HandleQuizSubmit", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Adding parameters matching the SP definition
                    cmd.Parameters.AddWithValue("@UserID", UserID);
                    cmd.Parameters.AddWithValue("@QuizID", QuizID);
                    cmd.Parameters.AddWithValue("@JsonInput", JsonInput);

                    await con.OpenAsync();

                    // Using ExecuteScalar to get the 'success' column from the SP's SELECT statement
                    object? result = await cmd.ExecuteScalarAsync();

                    if (result != null)
                    {
                        // In SQL, 1 is true, 0 is false
                        return Convert.ToBoolean(result);
                    }

                    return false;
                }
            }
        }




    }
}
