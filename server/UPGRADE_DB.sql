-- One-time fix for a database that was already created with the old
-- initialise_database.sql, where BugReports.test was the primary key.
--
-- Run this ONLY if you have an existing PfizerChallengeCOMP221 database.
-- If you have not created the database yet, ignore this file: just run
-- initialise_database.sql, which is already correct.
--
-- Usage:  mysql -u root -p < UPGRADE_DB.sql
--
-- The statements are deliberately separate. MySQL rejects dropping and
-- re-adding a foreign key with the same name inside a single ALTER.

USE PfizerChallengeCOMP221;

-- 1. Drop the foreign key that ties `test` to Tests(id).
ALTER TABLE BugReports
    DROP FOREIGN KEY fk_bugreports_test;

-- 2. `test` can no longer be AUTO_INCREMENT once it stops being the key.
ALTER TABLE BugReports
    MODIFY COLUMN test INT NOT NULL;

-- 3. Drop the old primary key.
ALTER TABLE BugReports
    DROP PRIMARY KEY;

-- 4. Add the surrogate key the Django model expects.
ALTER TABLE BugReports
    ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- 5. Put the foreign key back on `test`.
ALTER TABLE BugReports
    ADD CONSTRAINT fk_bugreports_test
        FOREIGN KEY (test) REFERENCES Tests(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- Result: BugReports is now (id, test, report_text, submitted_by) and more
-- than one report can exist per test.
