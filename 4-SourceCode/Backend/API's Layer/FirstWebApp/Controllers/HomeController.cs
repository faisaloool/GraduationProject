using System.Diagnostics;
using FirstWebApp.Models;
using Microsoft.AspNetCore.Mvc;

namespace FirstWebApp.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public IActionResult About()
        {
            return View();
        }

        public IActionResult Contact()
        {
            ViewData["Title"] = "Contact Us";
            ViewData["Email"] = "albabafaisal81@gmail.com";
            ViewData["Phone"] = "+962-789-901-109";
            ViewData["Message"] = "Thank you for visiting our website!";
            return View();
        }

        public IActionResult Profile()
        {
            var person = new Person()
            {
                Name = "Faisal Albaba",
                Age = 20,
                Email = "albabafaisal81@gmail.com"
            };
            return View(person);
        }

        public IActionResult Course()
        {
            var course = new Course()
            {
                CourseName = "Python",
                Instructor = "Dr.Faisal Albaba",
                Credits = 200
            };
            return View(course);
        }

        public IActionResult CourseInfo()
        {
            var course = new Course()
            {
                CourseName = "Python",
                Instructor = "Dr.Faisal Albaba",
                Credits = 200
            };
            return View(course);
        }

        private List<Course> courses = new List<Course>()
        {
            new Course { CourseName = "Web Programming", Instructor = "Dr. Hala", Credits = 3 },
            new Course { CourseName = "Database Systems", Instructor = "Dr. Samer", Credits = 3 },
            new Course { CourseName = "Software Engineering", Instructor = "Dr. Omar", Credits = 4 },
            new Course { CourseName = "Operating Systems", Instructor = "Dr. Faisal", Credits = 300000 }
        };

        public IActionResult CourseList()
        {
            return View(courses);
        }

        public IActionResult CourseDetails(string name)
        {
            var selectedCourse = courses.FirstOrDefault(c => c.CourseName == name);
            return View(selectedCourse);
        }

        private List<Course> MyCourses = new List<Course>()
        {
            new Course { CourseName = "Operating Systems", Instructor = "Dr. Wafa'a Tarawneh", Credits = 135 },
            new Course { CourseName = "Software Quality Assurance", Instructor = "Dr. Asma'a Nawaiseh", Credits = 135 },
            new Course { CourseName = "Software Modelling", Instructor = "Dr. Asma'a Nawaiseh", Credits = 135 },
            new Course { CourseName = "Human-Computer Interaction", Instructor = "Dr. Ghaith Mahadeen", Credits = 135 },
            new Course { CourseName = "Computer Architecture", Instructor = "Dr. Basem Share'", Credits = 135 },
            new Course { CourseName = "Asp.net Lab", Instructor = "Dr. Hala Kreshe", Credits = 45 }
        };
        public IActionResult MyCourseList()
        {
            return View(MyCourses);
        }

        public IActionResult MyCourseDetails(string name)
        {
            var selectedCourse = MyCourses.FirstOrDefault(c => c.CourseName == name);
            return View(selectedCourse);
        }

        public IActionResult StudentSurveyForm()
        {
            return View();
        }
        [HttpPost]
        public IActionResult StudentSurveyForm(StudentSurvey survey)
        {
            return View("SurveyResult", survey);
        }

        public IActionResult StudentRegistrationForm()
        {
            return View();
        }
        [HttpPost]
        public IActionResult StudentRegistrationForm(StudentRegistration registration)
        {
            return View("RegistrationResult", registration);
        }


    }
}
