using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Client;
using Newtonsoft.Json.Serialization;
using QuizAI_Business_Layer;
using QuizAIDataBack;
using System.ComponentModel.DataAnnotations;




namespace QuizAI_API_Layer.Controllers
{
    [Route("api/v1/quiz-ai")]
    [ApiController]
    public class UserController : ControllerBase
    {
        [HttpPost("Signup")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<QuizAIDataBack.RegisterationDTO>> CreateNewUser(RegisterationDTO UserInfo)
        {
            try
            {
                if (!QuizAIDataBack.Security.ValidateRegistration(UserInfo.Email, UserInfo.Password, UserInfo.FullName, ModelState))
                {
                    return BadRequest(ModelState);
                }


                QuizAIDataBack.UserDTO userInfo = new QuizAIDataBack.UserDTO(UserInfo.Email, UserInfo.Password, UserInfo.FullName);


                await QuizAI_Business_Layer.RegisterationBusinessLayer.RegisterNewUser(userInfo);


                return Ok(userInfo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("Login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> Login(QuizAIDataBack.UserLoginDTO UserLoginInfo)
        {
            try
            {
                // Get token + user info from BL
                var loginResult = await QuizAI_Business_Layer.RegisterationBusinessLayer.Login(UserLoginInfo);

                if (loginResult == null)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        status = 401,
                        message = "Invalid credentials.",
                        timestamp = DateTime.UtcNow,
                        error = new
                        {
                            code = "AUTH_FAILED",
                            details = "Email or password is incorrect."
                        }
                    });
                }

                return Ok(new
                {
                    success = true,
                    status = 200,
                    message = "Request completed successfully.",
                    timestamp = DateTime.UtcNow,
                    data = new
                    {
                        user = new
                        {
                            id = loginResult.User.id,
                            name = loginResult.User.FullName,
                            email = loginResult.User.Email
                        },
                        token = loginResult.Token

                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    status = 500,
                    message = "Internal server error occurred.",
                    timestamp = DateTime.UtcNow,
                    error = new
                    {
                        code = "SERVER_ERROR",
                        details = ex.Message
                    }
                });
            }
        }




        [HttpPost("Upload")]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<string>> UploadFile(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded.");

                var ext = Path.GetExtension(file.FileName).ToLower();
                
                var allowed = await ContentBusinessLayer.GetFileTypes();

                if (!allowed.Values.Contains(ext))
                    return BadRequest("Unsupported file type.");

                //this should be saved in a safer place.
                var path = Path.Combine("C:\\Users\\albab\\OneDrive - Mutah University\\Desktop\\Files", file.FileName);

                //the id should be given by the jwt.
                ContentDTO ContentInfo = new ContentDTO(1, allowed.First(x => x.Value == ext).Key, path, "123");//instead of "123", replace the api of the text extractor.
                await ContentBusinessLayer.SaveContent(ContentInfo, file);




                    
                return Ok("File uploaded!");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("health")]
        public async Task<ActionResult>GetHealth()
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
            return Ok(new
            {
                message = message, 
                overallStatus = readiness

            });


        }
    }


}
