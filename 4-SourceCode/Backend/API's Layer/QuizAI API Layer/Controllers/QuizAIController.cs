using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Client;
using Newtonsoft.Json.Serialization;
using QuizAI_Business_Layer;
using QuizAIDataBack;
using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;

//Qotiph


namespace QuizAI_API_Layer.Controllers
{
    [Route("api/v1/quiz-ai")]
    [ApiController]
    public class UserController : ControllerBase
    {
        //Don't forget to enable the user to login immediately when he signs up. [VII]
        [HttpPost("Signup")]
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
                CreateNewUserResponseDTO CreatedUser = await RegisterationBusinessLayer.RegisterNewUser(userInfo);
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









        [HttpPost("Login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserLoginResponseDTO>> Login(UserLoginRequestDTO UserLoginInfo)
        {
            try
            {
                // Get token + user info from BL
                var loginResult = await RegisterationBusinessLayer.Login(UserLoginInfo); //UserLoginResponseDTO

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



        [HttpGet("health")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> GetHealth()
        {
            try
            {
                string message = "";
                bool readiness = true;

                if (!await ServerHealthBusinessLayer.CheckDbConnection())
                {
                    message += "Database connection isn't valid now.\n";
                    readiness = false;
                }
                else
                {
                    message += "Database connection is ok.\n";
                }


                if (!ServerHealthBusinessLayer.IsDiskSpaceOk())
                {
                    message += "Disk space in the server isn't enough.\n";
                    readiness = false;
                }
                else
                {
                    message += "Disk space is more than enough.\n";
                }
                //don't forget to check the ai model under.
                if (true)
                {
                    message += "Ai model isn't ready now.\n";
                    readiness = false;
                }
                else
                {
                    message += "Ai model is ready now.\n";
                }
                HealthResponseDTO health = new HealthResponseDTO(message, readiness);

                return Ok(new ApiResponse<object>
                {

                    Success = true,
                    Status = 200,
                    Message = "Request completed successfully.",
                    Timestamp = DateTime.UtcNow,
                    Data = health,
                    Error = null,

                });
            }
            catch(Exception ex)
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
