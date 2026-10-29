-- Create and select the database
CREATE DATABASE IF NOT EXISTS PfizerChallengeCOMP221;
USE PfizerChallengeCOMP221;

-- Drop existing tables in reverse order of dependencies to avoid foreign key errors
DROP TABLE IF EXISTS BugReports;
DROP TABLE IF EXISTS Tests;
DROP TABLE IF EXISTS TestScripts;
DROP TABLE IF EXISTS Users;

-- 1. Users Table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL
);

-- 2. TestScripts Table
CREATE TABLE TestScripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    assigned INT,
    CONSTRAINT fk_testscripts_user 
        FOREIGN KEY (assigned) REFERENCES Users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

-- 3. Tests Table
CREATE TABLE Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    script_id INT NOT NULL,
    ordinal INT NOT NULL,
    description TEXT,
    expected TEXT,
    CONSTRAINT fk_tests_script 
        FOREIGN KEY (script_id) REFERENCES TestScripts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- 4. BugReports Table
CREATE TABLE BugReports (
    test INT NOT NULL,
    report_text TEXT,
    submitted_by INT NOT NULL,
    CONSTRAINT fk_bugreports_test 
        FOREIGN KEY (test) REFERENCES Tests(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_bugreports_user 
        FOREIGN KEY (submitted_by) REFERENCES Users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);