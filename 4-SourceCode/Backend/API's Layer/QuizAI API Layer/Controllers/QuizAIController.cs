using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Client;
using QuizAI_Business_Layer;
using QuizAI_DataBack_Layer;
using System.ComponentModel.DataAnnotations;

namespace QuizAI_API_Layer.Controllers
{
    [Route("api/v1/quiz-ai")]
    [ApiController]
    public class UserController : ControllerBase
    {
        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<QuizAI_DataBack_Layer.UserDTO>> CreateNewUser(UserDTO UserInfo)
        {
            try
            {
                if (QuizAI_DataBack_Layer.Module.ValidateRegistration(UserInfo.Email, UserInfo.Password, UserInfo.FullName, UserInfo.UserRole, ModelState))
                {
                    return BadRequest(ModelState); // returns all validation errors, including password, full name, and role
                }


                QuizAI_DataBack_Layer.UserDTO userInfo = new QuizAI_DataBack_Layer.UserDTO(UserInfo.Email, UserInfo.Password, UserInfo.FullName, UserInfo.UserRole);


                await QuizAI_Business_Layer.QuizAIBL.RegisterNewUser(userInfo);


                return Ok(userInfo);
            }
            catch (Exception ex)
            {
                // log exception somewhere
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }

        }

        [HttpPost("Login")]
        public static async Task<ActionResult<QuizAI_DataBack_Layer.UserDTO>> Login(QuizAI_DataBack_Layer.UserLoginDTO UserLoginInfo)
        {
            await QuizAI_Business_Layer.QuizAIBL.Login(UserLoginInfo);


        }
    }


}
