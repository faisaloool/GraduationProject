using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Client;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Serialization;
using QuizAI_Business_Layer;
using QuizAIDataBack;
using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace QuizAI_API_Layer.Controllers
{
    [Route("api/v1/quiz-ai")]
    [ApiController]
    public class UserController : ControllerBase
    {
        //Don't forget to enable the user to login immediately when he signs up. [VII]
        [HttpPost("Signup")] //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<CreateNewUserResponseDTO>> CreateNewUser(CreateNewUserRequestDTO UserInfo)
        {
            try
            {
                if (!Security.ValidateRegistration(UserInfo.Email, UserInfo.Password, UserInfo.Name, ModelState))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Status = 400,
                        Message = "Validation errors occurred.",
                        Timestamp = DateTime.UtcNow,
                        Data = null,
                        Error = new ApiError
                        {
                            Code = "VALIDATION_FAILED",
                            Details = string.Join("; ", ModelState.Values
                                .SelectMany(x => x.Errors)
                                .Select(x => x.ErrorMessage))
                        }
                    });
                }
                CreateNewUserRequestDTO userInfo = new CreateNewUserRequestDTO(UserInfo.Email, UserInfo.Password, UserInfo.Name);
                CreateNewUserResponseDTO CreatedUser = await UserBusinessLayer.RegisterNewUser(userInfo);
                return Ok(new ApiResponse<CreateNewUserResponseDTO>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = CreatedUser,
                    Error = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [HttpPost("VerifyNewUser")] //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> VerifyNewEmail(Guid UserID, string token)
        {
            try
            {
                bool result = await UserBusinessLayer.VerifyNewUser(UserID, token);
                if (result)
                {
                    return Ok(new ApiResponse<bool>
                    {
                        Success = true,
                        Status = 200,
                        Message = "Request completed successfully.",
                        Timestamp = DateTime.UtcNow,
                        Data = result,
                        Error = null
                    });
                }
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Status = 400,
                    Message = "Invalid email verification token.",
                    Timestamp = DateTime.UtcNow,
                    Error = new ApiError
                    {
                        Code = "TOKEN_INVALID",
                        Details = "The verification token you provided does not match any records."
                    },
                    Data = null
                });

            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [HttpPost("Login")] //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserLoginResponseDTO>> Login(UserLoginRequestDTO UserLoginInfo)
        {
            try
            {
                // Get token + user info from BL
                var loginResult = await UserBusinessLayer.Login(UserLoginInfo); //UserLoginResponseDTO

                if (loginResult == null)
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Status = 401,
                        Message = "Invalid credentials.",
                        Timestamp = DateTime.UtcNow,
                        Error = new ApiError
                        {
                            Code = "AUTH_FAILED",
                            Details = "Email or password is incorrect."
                        },
                        Data = null
                    });
                }
                //Fix this response to not have any anonymous types. (VII)
                return Ok(new ApiResponse<UserLoginResponseDTO>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = loginResult
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error occurred.",
                    Timestamp = DateTime.UtcNow,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    },
                    Data = null
                });
            }
        }

        [HttpGet("health")] //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> GetHealth()
        {
            try
            {
                bool DBConReadiness = await ServerHealthBusinessLayer.CheckDbConnection();
                bool DiskSpaceReadiness = ServerHealthBusinessLayer.IsDiskSpaceOk();
                bool AIModelReadiness = false;


                bool OverallReadiness = (DBConReadiness && DiskSpaceReadiness && AIModelReadiness);

                return Ok(new ApiResponse<HealthResponseDTO>
                {

                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = new HealthResponseDTO(OverallReadiness, DBConReadiness, DiskSpaceReadiness, AIModelReadiness),
                    Error = null,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }

        }


        [HttpPost("Forgot-Password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        //used when the user presses the forgot password button. it generates a token and sends it to his email. //working
        public async Task<ActionResult<ApiResponse<ForgotPasswordResponseDTO>>> ForgotPassword(ForgotPasswordRequestDTO ForgotPasswordInfo)
        {
            try
            {
                await UserBusinessLayer.ForgotPassword(ForgotPasswordInfo);
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [HttpGet("VerifyForgetPasswordToken")] //this function is used when the user clicks the link in his email. it verifies the token. //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<object>> VerifyToken([FromQuery] string token)
        {
            try
            {
                Guid? userID = await UserBusinessLayer.UseForgotPasswordToken(token);
                if (userID != Guid.Empty)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Success = true,
                        Status = 200,
                        Message = "Request completed successfully.",
                        Timestamp = DateTime.UtcNow,
                        Data = new
                        {
                            TokenFound = true,
                            UserID = userID
                        }
                    });
                }
                return BadRequest(new ApiResponse<bool>
                {
                    Success = false,
                    Status = 400,
                    Message = "Invalid or expired token",
                    Timestamp = DateTime.UtcNow,
                    Data = false
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [HttpPost("ResetPassword")] //Used when the user resets his password (screen) //working
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> ResetPassword(Guid id, string password)
        {
            try
            {
                bool result = await UserBusinessLayer.ResetUserPassword(id, password);
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = new { isPasswordReseted = result },
                    Error = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }


        [Authorize]
        [HttpGet("exams")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<QuizResponseDTO>>> GetUserExams()
        {

            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);


                if (userIdClaim == null)
                {
                    return Unauthorized();
                }
                Guid UserID = Guid.Parse(userIdClaim!.Value);


                QuizResponseDTO Quizzes = await QuizzesBusinessLayer.GetQuizzesByUserID(UserID);
                if (Quizzes.QuizzesInfo == null || Quizzes.QuizzesInfo.Count == 0)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Status = 404,
                        Message = "The requested resource was not found.",
                        Timestamp = DateTime.UtcNow,
                        Data = null,
                        Error = new ApiError
                        {
                            Code = "RESOURCE_NOT_FOUND",
                            Details = $"No quizzes found for User ID {UserID}."
                        }
                    });
                }
                return Ok(new ApiResponse<QuizResponseDTO>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = Quizzes,
                    Error = null
                });

            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [Authorize]
        [HttpDelete("quiz/delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteQuiz(Guid QuizID)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);


                if (userIdClaim == null)
                {
                    return Unauthorized();
                }
                Guid UserID = Guid.Parse(userIdClaim!.Value);


                bool result = await QuizzesBusinessLayer.DeleteQuizUsingQuizID(QuizID, UserID);
                if (result == true)
                {
                    return Ok(new ApiResponse<bool>
                    {
                        Success = true,
                        Status = 200,
                        Message = "Request completed successfully.",
                        Timestamp = DateTime.UtcNow,
                        Data = result,
                        Error = null
                    });
                }
                return BadRequest(new ApiResponse<bool>
                {
                    Success = false,
                    Status = 400,
                    Message = "Quiz not found or not owned by user.",
                    Timestamp = DateTime.UtcNow,
                    Data = false,
                    Error = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [Authorize]
        [HttpPut("{quizId}/rename")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiResponse<bool>>> RenameQuiz(Guid quizId, [FromBody] RenameQuizRequestDTO request)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized();
                }
                Guid UserID = Guid.Parse(userIdClaim!.Value);


                bool result = await QuizzesBusinessLayer.RenameQuiz(quizId, UserID, request.Name);
                if (!result)
                {
                    return BadRequest(new ApiResponse<bool>
                    {
                        Success = false,
                        Status = 400,
                        Message = "Quiz not found or not owned by user.",
                        Timestamp = DateTime.UtcNow,
                        Data = false,
                        Error = null
                    });
                }
                return Ok(new ApiResponse<bool>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = result,
                    Error = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }

        [Authorize]
        [HttpPost("Share")] //Sender side endpoint
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> Share(Guid QuizID)
        {
            try
            {
                string token = await QuizzesBusinessLayer.CreateShareQuizToken(QuizID);
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = token,
                    Error = null,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }

        }

        [Authorize] //(Recipient side endpoint)
        [HttpPost("ShareVerify")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> ShareQuiz(string Token)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized();
                }
                Guid UserID = Guid.Parse(userIdClaim!.Value);

                bool result = await QuizzesBusinessLayer.ShareQuiz(UserID, Token);

                if (result)
                {
                    return Ok(new ApiResponse<bool>
                    {

                        Success = true,
                        Status = 200,
                        Message = "Request completed successfully.",
                        Timestamp = DateTime.UtcNow,
                        Data = true,
                        Error = null,
                    });
                }

                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Status = 400,
                    Message = "A problem occured while sharing the quiz",
                    Timestamp = DateTime.UtcNow,
                    Data = null,
                    Error = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }




        }
        
        [Authorize]
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<Quiz>>> GetQuizById([FromRoute] Guid id, [FromQuery] string QuizTitle)
        {
            try
            {
                var quiz = await QuizzesBusinessLayer.GetQuizQuestionsBasedOnQuizID(id, QuizTitle);

                if (quiz == null || quiz.Questions.Count == 0)
                {
                    return NotFound(new ApiResponse<Quiz>
                    {
                        Success = false,
                        Status = 404,
                        Message = "Quiz not found",
                        Timestamp = DateTime.UtcNow
                    });
                }

                return Ok(new ApiResponse<Quiz>
                {
                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = quiz
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Timestamp = DateTime.UtcNow,
                    Error = new ApiError { Code = "SERVER_ERROR", Details = ex.Message }
                });
            }
        }

        [Authorize]
        [HttpDelete("Questions/delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteQuestion(Guid QuestionID, Guid QuizID)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized();
                }
                Guid UserID = Guid.Parse(userIdClaim!.Value);

                bool result = await QuizzesBusinessLayer.DeleteQuestionUsingQuestionID(QuestionID, QuizID, UserID);

                if (result)
                {
                    return Ok(new ApiResponse<bool>
                    {

                        Success = true,
                        Status = 200,
                        Message = "Request completed successfully.",
                        Timestamp = DateTime.UtcNow,
                        Data = true,
                        Error = null,
                    });
                }

                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Status = 400,
                    Message = "A problem occured while deleting the question.",
                    Timestamp = DateTime.UtcNow,
                    Data = null,
                    Error = null
                });

            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Status = 500,
                    Message = "Internal server error",
                    Data = null,
                    Error = new ApiError
                    {
                        Code = "SERVER_ERROR",
                        Details = ex.Message
                    }
                });
            }
        }
    }
}




//[HttpPost("Upload")]
//[ProducesResponseType(StatusCodes.Status400BadRequest)]
//[ProducesResponseType(StatusCodes.Status200OK)]
//[ProducesResponseType(StatusCodes.Status500InternalServerError)]
//public async Task<ActionResult<string>> UploadFile(IFormFile file)
//{
//    try
//    {
//        if (file == null || file.Length == 0)
//            return BadRequest("No file uploaded.");

//        var ext = Path.GetExtension(file.FileName).ToLower();

//        var allowed = await ContentBusinessLayer.GetFileTypes();

//        if (!allowed.Values.Contains(ext))
//            return BadRequest("Unsupported file type.");

//        //this should be saved in a safer place.
//        var path = Path.Combine("C:\\Users\\albab\\OneDrive - Mutah University\\Desktop\\Files", file.FileName);

//        //the id should be given by the jwt.
//        ContentDTO ContentInfo = new ContentDTO(1, allowed.First(x => x.Value == ext).Key, path, "123");//instead of "123", replace the api of the text extractor.
//        await ContentBusinessLayer.SaveContent(ContentInfo, file);





//        return Ok("File uploaded!");
//    }
//    catch (Exception ex)
//    {
//        return StatusCode(500, $"Internal server error: {ex.Message}");
//    }
//}