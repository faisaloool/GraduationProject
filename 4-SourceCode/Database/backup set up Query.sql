RESTORE DATABASE QuizAI
FROM DISK = 'C:\Database\QuizAI.bak'
WITH REPLACE;


RESTORE FILELISTONLY FROM DISK = 'C:\Database\QuizAI.bak';



RESTORE DATABASE QuizAI
FROM DISK = 'C:\Database\QuizAI.bak'
WITH REPLACE,
MOVE 'QuizAI' TO 'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\QuizAI.mdf',
MOVE 'QuizAI_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\QuizAI_log.ldf';


select * from users