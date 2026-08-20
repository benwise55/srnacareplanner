IF OBJECT_ID(N'dbo.LoginEvents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.LoginEvents (
    event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    student_id NVARCHAR(100) NOT NULL,
    resource_id NVARCHAR(100) NOT NULL,
    login_timestamp DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    session_id NVARCHAR(200) NULL,
    success_bit BIT NOT NULL DEFAULT 1,
    source NVARCHAR(100) NULL,
    ip_address NVARCHAR(45) NULL,
    metadata NVARCHAR(1000) NULL
  );
END
GO

CREATE INDEX IX_LoginEvents_StudentId
ON dbo.LoginEvents (student_id);

CREATE INDEX IX_LoginEvents_ResourceId
ON dbo.LoginEvents (resource_id);

CREATE INDEX IX_LoginEvents_LoginTimestamp
ON dbo.LoginEvents (login_timestamp);
