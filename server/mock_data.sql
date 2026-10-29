-- 1. Insert sample Testers (No dependencies)[cite: 1]
INSERT INTO Testers (first_name, last_name) VALUES 
('Alice', 'Smith'),
('Bob', 'Jones'),
('Charlie', 'Brown');

-- 2. Insert sample TestScripts (Depends on Testers via 'assigned')[cite: 1]
INSERT INTO TestScripts (label, assigned) VALUES 
('Login Authentication Script', 1),
('Checkout Flow Script', 2),
('User Profile Update Script', 3);

-- 3. Insert sample Tests (Depends on TestScripts via 'script_id')[cite: 1]
INSERT INTO Tests (script_id, ordinal, description, expected) VALUES 
(1, 1, 'Enter valid username and password and click login', 'User is redirected to dashboard'),
(1, 2, 'Enter invalid password and click login', 'Error message displays invalid credentials'),
(2, 1, 'Add item to cart and proceed to checkout', 'Checkout page loads with correct total'),
(3, 1, 'Update email address in profile settings', 'Success notification appears and email is updated');

-- 4. Insert sample BugReports (Depends on Tests via primary key 'test' and Testers via 'submitted_by')[cite: 1]
-- Note: 'test' corresponds to the Tests(id) primary key[cite: 1].
INSERT INTO BugReports (test, report_text, submitted_by) VALUES 
(2, 'Error message was generic instead of specifying invalid password.', 1),
(4, 'Success notification did not disappear automatically after 5 seconds.', 3);