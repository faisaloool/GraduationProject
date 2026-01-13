using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;


namespace QuizAIDataBack
{
    public class UserDTO
    {
        public Guid id { get; set; }
        public string Name { get; set; }
        [EmailAddress]
        public string Email { get; set; }

        public UserDTO(Guid id, string email, string name)
        {
            this.id = id;
            this.Name = name;
            this.Email = email;
        }
    }

    public class CreateNewUserResponseDTO
    {
        public UserDTO user { get; set; }
        public string token { get; set; }

        public CreateNewUserResponseDTO() { }
        public CreateNewUserResponseDTO(UserDTO user)
        {
            this.user = user;
        }
    }

    public class CreateNewUserRequestDTO
    {
        public string Name { get; set; }
        [EmailAddress]
        public string Email { get; set; }

        public string Password { get; set; }

        public CreateNewUserRequestDTO() { }
        public CreateNewUserRequestDTO(string Email, string Password, string Name)
        {
            this.Email = Email;
            this.Password = Password;
            this.Name = Name;
        }
    }

    public class UserLoginRequestDTO
    {
        public string Email { get; set; }
        public string Password { get; set; }

        public UserLoginRequestDTO() { }
    }

    public class UserLoginResponseDTO
    {
        public UserDTO user { get; set; }
        public string token { get; set; }
        public UserLoginResponseDTO() { }

        public UserLoginResponseDTO(UserDTO user, string token)
        {
            this.user = user;
            this.token = token;
        }

        public UserLoginResponseDTO(Guid id, string email, string name)
        {
            this.user.id = id;
            this.user.Email = email;
            this.user.Name = name;
        }
    }

    public class HealthResponseDTO
    {
        public bool OverallStatus { get; set; }

        public bool DBConReadiness { get; set; }

        public bool DiskSpaceReadiness { get; set; }

        public bool AIModelReadiness { get; set; }

        public HealthResponseDTO(bool overall, bool DBConnectionReadiness, bool DiskSpaceReadiness, bool AIModelReadiness)
        {
            this.OverallStatus = overall;
            this.DBConReadiness = DBConnectionReadiness;
            this.DiskSpaceReadiness = DiskSpaceReadiness;
            this.AIModelReadiness = AIModelReadiness;
        }
    }

    public class ForgotPasswordRequestDTO
    {
        [EmailAddress]
        public string Email { get; set; }
        public ForgotPasswordRequestDTO() { }
        public ForgotPasswordRequestDTO(string email)
        {
            this.Email = email;
        }
    }

    public class ForgotPasswordResponseDTO
    {
        public string Message { get; set; }
        public ForgotPasswordResponseDTO() { }
        public ForgotPasswordResponseDTO(string message)
        {
            this.Message = message;
        }
    }

    public class ResetPasswordTokenDTO
    {
        public Guid ID { get; set; }
        public Guid UserID { get; set; }
        public string Token { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool isUsed { get; set; }

        public ResetPasswordTokenDTO() { }
        public ResetPasswordTokenDTO(Guid ID, Guid UserID, string Token, DateTime CreatedAt, DateTime ExpiresAt, bool isUsed)
        {
            this.ID = ID;
            this.UserID = UserID;
            this.Token = Token;
            this.CreatedAt = CreatedAt;
            this.ExpiresAt = ExpiresAt;
            this.isUsed = isUsed;
        }
    }


    public class QuizDTO
    {
        public Guid QuizID { get; set; }
        public string QuizTitle { get; set; }
        public QuizDTO(Guid QuizID, string QuizTitle)
        {
            this.QuizID = QuizID;
            this.QuizTitle = QuizTitle;
        }
    }

    public class QuizResponseDTO
    {
        public List<QuizDTO> QuizzesInfo { get; set; } = new List<QuizDTO>();
        public QuizResponseDTO() { }
    }

    public class RenameQuizRequestDTO
    {
        public string Name { get; set; }
    }

    public class Quiz
    {
        public Guid QuizID { get; set; }
        public string Title { get; set; }
        public int TotalMarks { get; set; }
        public List<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    }

    public class QuizQuestion
    {
        public Guid QuestionID { get; set; }
        public string Type { get; set; }
        public string QuestionContent { get; set; }
        public string SuggestedAnswer { get; set; }
        public List<MCQChoices> choices { get; set; } = new List<MCQChoices>();
    }

    public class MCQChoices
    {
        public Guid ChoiceID { get; set; }
        public string Choice { get; set; }
        public Guid Question_ID { get; set; }
    }










    public class Database
    {
        //Don't forget to move this to a secure location like environment variables or a secure vault in production
        public static string _connectionString = "Server = localhost; Database=QuizAI;User Id = sa; Password=sa123456;Encrypt=False;TrustServerCertificate=True;Connection Timeout = 30";

        public static async Task<bool> IsDbConnectedAsync()
        {
            try
            {
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    using (SqlCommand cmd = new SqlCommand("SP_CheckDbConnectivity", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;

                        // Execute the stored procedure
                        object result = await cmd.ExecuteScalarAsync();

                        // If result is 1, DB is connected
                        return result != null && Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DB Connection Failed: {ex.Message}");
                return false;
            }

        }
    }

    public class Security
    {
        public static byte[] GenerateSalt(int size = 16)
        {
            byte[] salt = new byte[size];
            RandomNumberGenerator.Fill(salt);
            return salt;
        }

        public static byte[] HashData(string input, byte[] salt, int iterations = 100_000, int hashSize = 32)
        {
            using (var pbkdf2 = new Rfc2898DeriveBytes(input, salt, iterations, HashAlgorithmName.SHA256))
            {
                return pbkdf2.GetBytes(hashSize);
            }
        }

        public static bool IsValidPassword(string password)
        {
            if (string.IsNullOrEmpty(password) || password.Length < 8)
                return false;

            if (!Regex.IsMatch(password, @"[A-Z]"))
                return false;

            if (!Regex.IsMatch(password, @"[a-z]"))
                return false;

            if (!Regex.IsMatch(password, @"[\W_]"))
                return false;

            return true;
        }
        public static bool IsValidUserRole(string UserRole)
        {
            if (UserRole != "Admin" && UserRole != "Student" && UserRole != "Instructor" && UserRole != "Developer")
            {
                return false;
            }
            return true;
        }

        public static bool ValidateRegistration(string email, string password, string fullName, ModelStateDictionary modelState)
        {
            bool isValid = true;

            // Email validation
            if (string.IsNullOrWhiteSpace(email))
            {
                modelState.AddModelError("Email", "Email cannot be empty.");
                isValid = false;
            }
            else
            {
                try
                {
                    var addr = new System.Net.Mail.MailAddress(email);
                    if (addr.Address != email)
                    {
                        modelState.AddModelError("Email", "Invalid email format.");
                        isValid = false;
                    }
                }
                catch
                {
                    modelState.AddModelError("Email", "Invalid email format.");
                    isValid = false;
                }
            }

            // Password validation
            if (!Security.IsValidPassword(password))
            {
                modelState.AddModelError("Password", "Password must be at least 8 characters, include uppercase, lowercase, and a symbol.");
                isValid = false;
            }

            // FullName validation
            if (string.IsNullOrWhiteSpace(fullName) || fullName.Length < 3)
            {
                modelState.AddModelError("FullName", "Full name must be at least 3 characters.");
                isValid = false;
            }
            return isValid;
        }
        //public static bool ValidateLogin(UserLoginDTO userInfo)
        //{
        //    bool IsValid = true;

        //    if (string.IsNullOrEmpty(userInfo.Email) || string.IsNullOrEmpty(userInfo.Password))
        //        IsValid = false;


        //    return IsValid;
        //}


    }

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public int Status { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public T Data { get; set; }
        public ApiError Error { get; set; }
    }

    public class ApiError
    {
        public string Code { get; set; }
        public string Details { get; set; }
    }
}