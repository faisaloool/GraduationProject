using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;


namespace QuizAI_DataBack_Layer
{
    public class Module
    {
        //Don't forget to move this to a secure location like environment variables or a secure vault in production
        public static string _connectionString = "Server = localhost; Database=QuizAI;User Id = sa; Password=sa123456;Encrypt=False;TrustServerCertificate=True;Connection Timeout = 30";

        public static byte[] GenerateSalt(int size = 16)
        {
            byte[] salt = new byte[size];
            RandomNumberGenerator.Fill(salt);
            return salt;
        }

        public static byte[] HashData(string input, byte[] salt, int iterations = 100_000, int hashSize = 32)//6
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

        public static bool ValidateRegistration(string email, string password, string fullName, string userRole, ModelStateDictionary modelState)
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
            if (!QuizAI_DataBack_Layer.Module.IsValidPassword(password))
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

            // UserRole validation
            if (!QuizAI_DataBack_Layer.Module.IsValidUserRole(userRole))
            {
                modelState.AddModelError("UserRole", "User role is invalid.");
                isValid = false;
            }

            return isValid;
        }
    }
}