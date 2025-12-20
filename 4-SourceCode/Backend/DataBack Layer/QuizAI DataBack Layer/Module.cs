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
        public int id { get; set; }
        public string Name { get; set; }
        [EmailAddress]
        public string Email { get; set; }

        public UserDTO(int id, string email, string name)
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

        public UserLoginResponseDTO(int id, string email, string name)
        {
            this.user.id = id;
            this.user.Email = email;
            this.user.Name = name;
        }
    }

    public class HealthResponseDTO
    {
        public string message { get; set; }
        public bool OverallStatus { get; set; }
        public HealthResponseDTO(string message, bool overall)
        {
            this.message = message;
            this.OverallStatus = overall;
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
        public int ID { get; set; }
        public int UserID { get; set; }
        public string Token { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool isUsed { get; set; }

        public ResetPasswordTokenDTO() { }
        public ResetPasswordTokenDTO(int ID, int UserID, string Token, DateTime CreatedAt, DateTime ExpiresAt, bool isUsed)
        {
            this.ID = ID;
            this.UserID = UserID;
            this.Token = Token;
            this.CreatedAt = CreatedAt;
            this.ExpiresAt = ExpiresAt;
            this.isUsed = isUsed;
        }
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
















//public class RegisterationDTO
//{
//    public int id;
//    [Required]
//    [EmailAddress]
//    public string Email { get; set; }

//    [Required]
//    public string Password { get; set; }
//    [Required]

//    public string Name { get; set; }


//    //public string UserRole { get; set; }
//    public RegisterationDTO(string Email, string Password, string FullName)
//    {
//        this.id = id;
//        this.Email = Email;
//        this.Password = Password;
//        this.Name = FullName;
//    }
//    public RegisterationDTO(int id, string Email, string FullName)
//    {
//        this.id = id;
//        this.Email = Email;
//        this.Name = FullName;
//    }
//    public RegisterationDTO() { }
//}

//public class UserDTO
//{
//    public int id;
//    [Required]
//    [EmailAddress]
//    public string Email { get; set; }

//    [Required]
//    [JsonIgnore]
//    public string Password { get; set; }
//    [Required]

//    public string FullName { get; set; }


//    //public string UserRole { get; set; }
//    public UserDTO(string Email, string Password, string FullName)
//    {
//        this.id = id;
//        this.Email = Email;
//        this.Password = Password;
//        this.FullName = FullName;
//    }
//    public UserDTO(int id, string Email, string FullName)
//    {
//        this.id = id;
//        this.Email = Email;
//        this.FullName = FullName;
//    }
//}




//public class UserLoginDTO
//{
//    [Required]
//    [EmailAddress]
//    public string Email { get; set; }
//    [Required]
//    public string Password { get; set; }
//    public UserLoginDTO(string Email, string Password)
//    {
//        this.Email = Email;
//        this.Password = Password;
//    }
//}

//public class ContentDTO
//{
//    public int UserID { get; set; }
//    public int FileType { get; set; }
//    public string FilePath { get; set; }
//    public string ExtractedText { get; set; }

//    public ContentDTO(int UserID, int FileType, string FilePath, string ExtractedText)
//    {
//        this.UserID = UserID;
//        this.FileType = FileType;
//        this.FilePath = FilePath;
//        this.ExtractedText = ExtractedText;
//    }
//}
//public class LoginResultDTO
//{
//    public UserDTO User { get; set; }
//    public string Token { get; set; }
//}