-- Seed: Insert new teachers and corresponding users (2025-09-25)
-- Assumptions:
--  - Schema from db-schema.sql exists
--  - Teachers inserted here are new (names unique). If a teacher name already exists, use ON CONFLICT handling or adjust names.
--  - Passwords are provided in plain text to match existing sample data style.

BEGIN;

-- 1) Insert teachers
WITH new_teachers AS (
  INSERT INTO teachers (name, email, meeting_id, meeting_password, description, is_active)
  VALUES
    ('Rio John Sumagaysay',       'rio.john.sumagaysay@langschool.com',       '6696189416',  '888888',  'Age: 34. Degree: Bachelor in Broadcasting, Diploma in Teaching, Master of Arts in Education Language Teaching (English)', TRUE),
    ('Arlene Tanguan',            'arlene.tanguan@langschool.com',             '6971531093',  '554619',  'Age: 37. Degree: Bachelor of Education major in Biological Sciences', TRUE),
    ('Rowena Panganiban',         'rowena.panganiban@langschool.com',          '5618574681',    '531952',  'Age: 57 . B.S. Computer Engineering', TRUE),
    ('April Dawn Cudo',           'april.dawn.cudo@langschool.com',            '4966533212',  '333333',  'Age: 38. Degree: BSIT and Diploma in Teaching', TRUE),
    ('Nikko U. Balatero',         'nikko.balatero@langschool.com',             '7449757403',  '66666',   'Age: 28 . Degree:   Bachelors of Physical Education School of Physical Education.  Masters of Educational Technology and Learning Innovation.  Masters of Educational Leadership', TRUE),
    ('Marjorie Gonzaga',          'marjorie.gonzaga@langschool.com',           '4916501992',  '477480',  'Age: 33. Degree: BEEd General Education', TRUE),
    ('Charlyn Mae G. Lanorias',   'charlyn.lanorias@langschool.com',           '8632563386',  '444444',  'Age: 40. Degree: Bachelor of Secondary Education', TRUE),
    ('Jeza S. Tulod',             'jeza.tulod@langschool.com',                 '5839887865',  '110214',  'Age: 27. Degree: Bachelor of Secondary Education Major in English', TRUE),
    ('Sajarah May Vistar',        'sajarah.vistar@langschool.com',             '3330564673',  '36027',   'Age: 31. Degree: B.S in Information Technology', TRUE),
    ('Ashley Galvez',             'ashley.galvez@langschool.com',              '5977147627',  '448322',  'Age: 23. Degree: Bachelor of Science in Medical Laboratory Science', TRUE),
    ('Zarlet Jenn Galvez',        'zarlet.galvez@langschool.com',              '4538984096',  '837515',  'Age: 23. Degree: BS Biology', TRUE),
    ('Jastine B.Basibas',         'jastine.basibas@langschool.com',            '7398479653',    '226027',  'Age: 33. Degree: BA Communications', TRUE),
    ('Ricci Rocio',               'ricci.rocio@langschool.com',                '5686509554',    '830160',  'Age: 38. Degree: BS Computer Science', TRUE),
    ('Lanie Rose Trojillo',       'lanie.trojillo@langschool.com',             '3248759218',  '222222',  'Age: 33. Degree: BS Accountancy / Diploma in Teaching Secondary Education major in Social Studies', TRUE),
    ('Charlene Porio',            'charlene.porio@langschool.com',             '327008407',   '777777',  'Age: 30. Degree: BSED English', TRUE),
    ('Justin Gallego',            'justin.gallego@langschool.com',             '3505857910',  '7777',    'Age: 22. Degree: Bachelor Degree', TRUE),
    ('Emilio Jose G. Cuello',     'emilio.cuello@langschool.com',              '8402811691',  '839282',  'Age: 22. Degree: Bachelor of Science in Information Technology', TRUE),
    ('Jay Ford C. Gonzales',      'jay.gonzales@langschool.com',               '7968981084',  '333333',  'Age: 33. Degree: BSEd English / MAEd Educational Management', TRUE)
  RETURNING id, name
)

-- 2) Insert corresponding users (role=teacher), linked by teacher name
INSERT INTO users (username, password, role, teacher_id, is_active)
SELECT u.username, u.password, 'teacher'::user_role, t.id, TRUE
FROM (
  VALUES
    ('Rio',      'Rio555',          'Rio John Sumagaysay'),
    ('Arlene',   'Arlene isthebest',      'Arlene Tanguan'),
    ('Rowena',   'Rowenaisthebest',       'Rowena Panganiban'),
    ('April',    'Aprilisthebest',        'April Dawn Cudo'),
    ('Nikko',    'Nikkoisthebest',        'Nikko U. Balatero'),
    ('Marj',     'Marjisthebest',         'Marjorie Gonzaga'),
    ('Charlyn',  'Charlynisthebest',      'Charlyn Mae G. Lanorias'),
    ('Jezza',    'Jezzaisthebest',        'Jeza S. Tulod'),
    ('Sajar',    'Sajaristhebest',        'Sajarah May Vistar'),
    ('Ashly',    'Ashlyisthebest',        'Ashley Galvez'),
    ('Zarlet',   'Zarletisthebest',       'Zarlet Jenn Galvez'),
    ('Justine',  'Justineisthebest',      'Jastine B.Basibas'),
    ('Ricci',    'Ricciisthebest',        'Ricci Rocio'),
    ('Lanie',    'Lanieisthebest',        'Lanie Rose Trojillo'),
    ('AJ',       'AJisthebest',           'Charlene Porio'),
    ('Justin',   'Justinisthebest',       'Justin Gallego'),
    ('Emilio',   'Emilioisthebest',       'Emilio Jose G. Cuello'),
    ('Jay',      'Jayisthebest',          'Jay Ford C. Gonzales')
) AS u(username, password, teacher_name)
JOIN new_teachers t ON t.name = u.teacher_name
-- Avoid duplicate user entries for existing teacher accounts
WHERE NOT EXISTS (
  SELECT 1 FROM users x WHERE x.role = 'teacher' AND x.teacher_id = t.id
);

-- Note: students.name is not unique; use WHERE NOT EXISTS and set added_date
INSERT INTO students (name, added_date, is_active)
SELECT v.name, CURRENT_DATE, TRUE
FROM (
  VALUES
    ('ALEX'),
    ('ALISA'),
    ('ALISA 2'),
    ('BARRY'),
    ('ALISON'),
    ('CICI'),
    ('ALLEN'),
    ('ALVIN'),
    ('AMY'),
    ('AMY2'),
    ('ANDY'),
    ('EMMA'),
    ('ANDY2'),
    ('ANDY3'),
    ('ANNA'),
    ('ANNA2'),
    ('JACKIE'),
    ('AUSTIN'),
    ('BERYL'),
    ('JIMMY'),
    ('BRANT'),
    ('CANDY'),
    ('CARLOS'),
    ('CHESTER'),
    ('CHRIS'),
    ('CLAIRE'),
    ('CORA'),
    ('CYNTHIA'),
    ('DAVID'),
    ('DEMO'),
    ('PETER2'),
    ('DIANA'),
    ('ELLA'),
    ('ELLA2'),
    ('ELLA3'),
    ('ELLIE'),
    ('TIFA'),
    ('ELSA'),
    ('ELSA2'),
    ('XINYA'),
    ('STEVEN 3'),
    ('EMMA2'),
    ('ERIC'),
    ('ETHAN'),
    ('EVAN'),
    ('EVAN2'),
    ('EVAN3'),
    ('EVAN5'),
    ('EVE'),
    ('FISH'),
    ('GRACE'),
    ('GRACE2'),
    ('DALIN'),
    ('JACK'),
    ('JACK2'),
    ('JASMINE'),
    ('JASON'),
    ('JENNIE'),
    ('LUNA2'),
    ('JERRY'),
    ('JIHO'),
    ('JOHN'),
    ('KEVIN'),
    ('LEON'),
    ('JURI'),
    ('LILY'),
    ('LITCHI'),
    ('LINDA'),
    ('LINDA2'),
    ('LUCAS'),
    ('LUCAS2'),
    ('LUCKY'),
    ('LUCKY2'),
    ('LUCY'),
    ('LUIS'),
    ('LUNA'),
    ('LUNA3'),
    ('MANCY'),
    ('MARIA'),
    ('MAX'),
    ('MAX2'),
    ('MAX4'),
    ('MIKE'),
    ('MILLY'),
    ('MILLY2'),
    ('MIYA'),
    ('Mr Hong'),
    ('NAOMI'),
    ('NICKY'),
    ('PETE'),
    ('PETER'),
    ('ROSE'),
    ('RUO'),
    ('SHAWN'),
    ('SHAY'),
    ('SHIN'),
    ('SKYE'),
    ('SOPHIE'),
    ('STEVEN'),
    ('STEVEN 2'),
    ('SUKIE'),
    ('SUNNY'),
    ('SUZY'),
    ('TERRY'),
    ('UNA'),
    ('VANESSA'),
    ('WILLIAM'),
    ('YUAN'),
    ('YUANNA'),
    ('SHIELA'),
    ('ZOE'),
    ('LEO'),
    ('SHEILA'),
    ('CAMILLE'),
    ('TYSON'),
    ('GUO GUO')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM students s WHERE s.name = v.name
);

COMMIT;


