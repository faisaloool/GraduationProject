using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuizAIDataBack;


namespace QuizAIBusinessLayer
{
    public class QuizAIBL
    {
        public static UserDTO RegisterNewUser(QuizAIDataBack.UserDTO NewUser)
        {
            return DataBack.CreateNewAccount(NewUser);
        }


    }
}
