CREATE USER 'testPhiz'@'%' IDENTIFIED BY 'testPhizPass@1';
GRANT ALL PRIVILEGES ON * . * TO 'testPhiz'@'%';
FLUSH PRIVILEGES;


CREATE DATABASE IF NOT EXISTS `phiz`;
commit;

USE phiz;

commit;

SET FOREIGN_KEY_CHECKS = 0;

--
-- DROP TABLE destination_type if exists;
--

DROP TABLE IF EXISTS destination_type;
--
-- CREATE TABLE destination_type;
--

CREATE TABLE IF NOT EXISTS destination_type (
    type_id int NOT NULL,
    type varchar(45) DEFAULT NULL,
    PRIMARY KEY (type_id),
    INDEX IDX_destination_type (type_id)
);

--
-- DROP TABLE destinations if exists;
--
DROP TABLE IF EXISTS destinations;

--
-- CREATE TABLE destinations;
--
CREATE TABLE destinations (
    -- The destination id, usually the FIPS STATE Code, but may also have a value for other jurisdictions (e.g., Philadelphia, New York City)
    dest_id character varying(128) NOT NULL,
    -- Destination type
    dest_type int NOT NULL,
    -- The endpoint URI for SOAP calls to the jurisdiction
    dest_uri character varying(1024) NOT NULL,
    -- The username for IZGateway for this destination
    username character varying(50),
    -- The password for IZGateway for this destination
    password character varying(256),
    -- The facility Id to use for this destination
    facility_id character varying(50),
    -- The MSH-3 for this destination
    MSH3 character varying(50),
    -- The MSH-4 for this destination
    MSH4 character varying(50),
    -- The MSH-5 for this destination
    MSH5 character varying(50),
    -- The MSH-6 for this destination
    MSH6 character varying(50),
    -- The MSH-22 for this destination
    MSH22 character varying(50),
    -- The RXA-11 for this destination
    RXA11 character varying(50),
    -- The WSDL Version to use for this destination
    dest_version character varying(50),
    -- Password expiry date
    pass_expiry date,
    jurisdiction_id int NOT NULL,
    PRIMARY KEY (dest_id, dest_type),
    FOREIGN KEY (dest_type) REFERENCES destination_type (type_id) ON DELETE RESTRICT,
    FOREIGN KEY (jurisdiction_id) REFERENCES jurisdiction (jurisdiction_id) ON DELETE RESTRICT ON UPDATE CASCADE 
);


--
-- DROP TABLE destination_change_request if exists;
--
DROP TABLE IF EXISTS destination_change_request;
--
--
-- CREATE TABLE destination_change_request;
--
CREATE TABLE destination_change_request (
  id int(11) NOT NULL AUTO_INCREMENT,
  username varchar(50) DEFAULT NULL,
  password varchar(50) DEFAULT NULL,
  facility_id varchar(50) DEFAULT NULL,
  MSH3 varchar(50) DEFAULT NULL,
  MSH4 varchar(50) DEFAULT NULL,
  MSH5 varchar(50) DEFAULT NULL,
  MSH6 varchar(50) DEFAULT NULL,
  MSH22 varchar(50) DEFAULT NULL,
  RXA11 varchar(50) DEFAULT NULL,
  jira_id varchar(50) DEFAULT NULL,
  dest_id varchar(128),
  dest_type int(11),
  scheduledAt DATETIME NOT NULL DEFAULT NOW(),
  requestedAt DATETIME NOT NULL DEFAULT NOW(),
  requestedBy varchar(50) DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (`dest_id`, `dest_type`) REFERENCES `destinations` (`dest_id`, `dest_type`) ON DELETE NO ACTION ON UPDATE NO ACTION
);

--
-- DROP TABLE endpointstatus if exists;
--
DROP TABLE IF EXISTS endpointstatus;
--
-- CREATE TABLE endpointstatus;
--
/* CREATE TABLE `endpointstatus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status` varchar(45) DEFAULT NULL,
  `detail` varchar(500) DEFAULT NULL,
  `retry_strategy` varchar(500) DEFAULT NULL,
  `diagnostics` varchar(500) DEFAULT NULL,
  `dest_id` varchar(128) DEFAULT NULL,
  `ran_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_DEST_ID_idx` (`dest_id`),
  CONSTRAINT `FK_DEST_ID` FOREIGN KEY (`dest_id`) REFERENCES `destinations` (`dest_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
 */
--
-- DROP TABLE jurisdiction if exists;
--
DROP TABLE IF EXISTS jurisdiction;
--
-- CREATE TABLE jurisdiction;
--
CREATE TABLE jurisdiction (
    jurisdiction_id int PRIMARY KEY AUTO_INCREMENT,
    name character varying(48) NOT NULL,
    description character varying(128) NOT NULL,
    dest_prefix character varying(10)
);


--
-- DROP TABLE messageheaderinfo if exists;
--
DROP TABLE IF EXISTS messageheaderinfo;

--
-- CREATE TABLE messageheaderinfo;
--

-- Information about expected values for MSH-03 through MSH-06 fields
-- in the HL7 Message for each destination.
CREATE TABLE messageheaderinfo (
	-- The destination identifier
    msh character varying(128) NOT NULL PRIMARY KEY,
    dest_id character varying(128),	
    iis character varying(128),	
    sourceType character varying(128)	
);
--
-- DROP TABLE audit_history if exists;
--

DROP TABLE IF EXISTS audit_history;

--
-- CREATE TABLE audit_history;
--

CREATE TABLE `audit_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tableName` VARCHAR(50) NOT NULL,
  `userName` VARCHAR(50) NOT NULL,
  `changeType` ENUM('Insert', 'Update', 'Delete') NOT NULL,
  `oldValues` VARCHAR(1024) NULL DEFAULT NULL,
  `newValues` VARCHAR(1024) NULL DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--
-- DROP TABLE accesscontrol if exists;
--
DROP TABLE IF EXISTS accesscontrol;

--
-- CREATE TABLE accesscontrol;
--

-- A table which stores available end-points by category and member level access
CREATE TABLE accesscontrol (
    category varchar(16),
    name varchar(256),
    member varchar(256),
    allow boolean,
    primary key (category, name, member)
);

-- Trigger to insert expiry date 
CREATE TRIGGER pass_expiry_insert
	BEFORE INSERT ON destinations
    FOR EACH ROW 
SET NEW.pass_expiry = DATE_ADD(curdate(), INTERVAL 1 YEAR);

-- Trigger to update expiry date 
DELIMITER $$
CREATE TRIGGER pass_expiry_update
	BEFORE UPDATE ON destinations
    FOR EACH ROW
    BEGIN
		IF NEW.password <> OLD.password THEN
			SET NEW.pass_expiry = DATE_ADD(curdate(), INTERVAL 1 YEAR);
		END IF;
    END$$

DELIMITER ;

--
-- TRUNCATE DATA FROM TABLE destination_type
--
TRUNCATE destination_type;

--
-- INSERT INTO TABLE destination_type;
--
INSERT IGNORE INTO destination_type VALUES 
    (1, 'PRODUCTION'),  -- APHL Production
    (2, 'TEST'),        -- Audacious Test Environment
    (3, 'ONBOARD'),     -- APHL Onboarding Environment
    (4, 'STAGE'),       -- APHL Staging Environment
    (5, 'DEV'),         -- Audacious Development Environment
    (6, 'UNKNOWN');     -- Unknown, used a default for migrations

--
-- TRUNCATE DATA FROM TABLE destinations;
--
TRUNCATE destinations;

--
-- INSERT INTO TABLE destinations;
--

INSERT INTO destinations(dest_id,dest_type,dest_uri,username,password,facility_id,MSH3,MSH4,MSH5,MSH6,MSH22,RXA11,dest_version,pass_expiry,jurisdiction_id)
VALUES
   ('404',5,'/dev/NotFound','NOT_FOUND_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('ak',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',3),
('al',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',4),
('ar',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',5),
('as',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',6),
('az',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',1),
('azurite',5,'https://localhost:10000/devstoreaccount1/izgw','IZGW','sv=2018-03-28&st=2022-09-16T19%3A32%3A55Z&se=2023-09-07T19%3A32%3A00Z&sr=c&sp=racwdl&sig=SzCq1AFTf2kADcqb16gAb7b6lL0sm1QuHFXV8JEPCGE%3D','IZGW','IZGW','IZGW','IZGW','IZGW','','','V2022-12-31','2024-07-12',1),
('ca',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',7),
('co',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',8),
('ct',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',9),
('dc',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',10),
('de',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',11),
('dev',5,'/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('dev2011',5,'/dev/client_Service','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011','2024-07-12',1),
('devwup',5,'/dev/IISService','','','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('dex-dev',5,'https://localhost/rest/upload/dex','dex-dev','dex-dev','IZGW','IZGW','IZGW','IZGW','IZGW','','','DEX1.0','2024-07-12',1),
('down',5,'https://192.0.2.0/dev/IISService','NON_RESPONDING_IP_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('fl',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',12),
('fm',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',12),
('ga',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',13),
('gu',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',13),
('ha',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',14),
('ia',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',15),
('il',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',17),
('in',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',18),
('invalid',5,'https://iis.invalid','NON_DNS_RESOLVABLE_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('io',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',16),
('ks',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',19),
('ky',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',20),
('la',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',21),
('ma',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',22),
('md',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',23),
('me',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',24),
('mh',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',25),
('mi',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',27),
('mn',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',26),
('mo',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',1),
('mp',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',1),
('ms',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',28),
('mt',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',29),
('nb',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',32),
('nc',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',30),
('nd',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',31),
('nh',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',33),
('nj',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',34),
('nm',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',35),
('nv',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',36),
('ny',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',37),
('nyc',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',38),
('oh',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',39),
('ok',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',40),
('or',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',41),
('pa',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',43),
('ph',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',42),
('pr',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',50),
('pw',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',46),
('reject',5,'https://localhost:12345/dev/IISService','REJECTING_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','','2024-07-12',1),
('ri',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',51),
('sc',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',52),
('sd',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',53),
('tn',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',54),
('tx',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',55),
('ut',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',57),
('va',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',58),
('vi',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',56),
('vt',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',59),
('wa',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',60),
('wi',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',61),
('wv',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',62),
('wy',5,'https://dev.izgateway.org/dev/IISService','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','IZGW','','2024-08-12',63)
;
--
-- TRUNCATE DATA FROM TABLE jurisdiction;
--
TRUNCATE jurisdiction;

--
-- INSERT INTO TABLE jurisdiction;
--
INSERT INTO jurisdiction (name, description, dest_prefix) VALUES
     ('DEVELOPMENT', 'Development Testing', 'dev'), 
     ('CDC', 'Centers for Disease Control', null),
     ('AK VacTrAK','Alaska', 'ak'),
     ('AL ImmPRINT','Alabama', 'al'),
     ('AR WebIZ','Arkansas', 'ar'),
     ('AZ ASIIS','Arizona', 'az'),
     ('CA CAIR','California', 'ca'),
     ('CO CIIS','Colorado', 'co'),
     ('CT WiZ','Connecticut', 'ct'),
     ('DC DOCIIS','District of Columbia', 'dc'),
     ('DE DelVAX','Delaware', 'de'),
     ('FL SHOTS','Florida', 'fl'),
     ('GA GRITS','Georgia', 'ga'),
     ('HI HIR','Hawaii', 'ha'),
     ('IA IRIS','Iowa', 'ia'),
     ('ID IRIS','Idaho', 'io'),
     ('IL I-CARE','Illinois', 'il'),
     ('IN CHIRP','Indiana', 'in'),
     ('KS WebIZ','Kansas', 'ks'),
     ('KY KYIR','Kentucky', 'ky'),
     ('LA LINKS','Louisiana', 'la'),
     ('MA MIIS','Massachusetts', 'ma'),
     ('MD IMMUNET','Maryland', 'md'),
     ('ME ImmPact2','Maine', 'me'),
     ('MI MCIR','Michigan', 'mi'),
     ('MN MIIC','Minnesota', 'mn'),
     ('MO ShowMeVax','Missouri', 'mi'),
     ('MS MIIX','Mississippi', 'ms'),
     ('MT imMTrax','Montana', 'mt'),
     ('NCIR','North Carolina', 'nc'),
     ('ND SIIS','North Dakota', 'nd'),
     ('NE NESIIS','Nebraska', 'nb'),
     ('NH VaxNH','New Hampshire', 'nh'),
     ('NJ NJIIS','New Jersey', 'nj'),
     ('NM NMSIIS','New Mexico', 'nm'),
     ('NV WebIZ','Nevada', 'nv'),
     ('NY NYSIIS','New York State', 'ny'),
     ('NYC CIR','New York City', 'nyc'),
     ('OH Impact SIIS','Ohio', 'oh'),
     ('OK OSIIS','Oklahoma', 'ok'),
     ('OR ALERT','Oregon', 'or'),
     ('PA PHIL','Pennsylvania - Philadelphia', 'ph'),
     ('PA SIIS','Pennsylvania', 'pa'),
     ('PI - American Samoa','PI - American Samoa', 'as'),
     ('PI - Federated States of Micronesia','PI - Federated States of Micronesia', 'fm'),
     ('PI - Palau','PI - Palau', 'pw'),
     ('PI - PI Guam','PI - Guam', 'gu'),
     ('PI - PI N Mariana Islands','PI - Commonwealth of the Mariana Islands', 'mp'),
     ('PI - Republic of the Marshall Islands','PI - Republic of the Marshall Islands', 'mh'),
     ('PR PRIR','Puerto Rico', 'pr'),
     ('RI CAIR','Rhode Island', 'ri'),
     ('SC SCI','South Carolina', 'sc'),
     ('SD SDIIS','South Dakota', 'sd'),
     ('TN TennIIS','Tennessee', 'tn'),
     ('TX ImmTrac','Texas', 'tx'),
     ('U.S. Virgin Islands','U.S. Virgin Islands', 'vi'),
     ('UT USIIS','Utah', 'ut'),
     ('VA VIIS','Virginia', 'va'),
     ('VT IMR','Vermont', 'vt'),
     ('WA WAIIS','Washington', 'wa'),
     ('WI WIR','Wisconsin', 'wi'),
     ('WV WVSIIS','West Virginia', 'wv'),
     ('WY WyIR','Wyoming', 'wy');

--
-- TRUNCATE DATA FROM TABLE messageheaderinfo;
--
TRUNCATE messageheaderinfo;
--
-- INSERT INTO TABLE messageheaderinfo;
--

INSERT IGNORE INTO messageheaderinfo (msh, dest_id, iis, sourceType)
VALUES
    ( 'Docket-1_0_0', null, null, 'Patient Access' ),
    ( '99990', 'dev', 'ma', 'IIS Share' ),
    ( '161143928', 'dev', 'md', 'IIS Share' ),
    ( '161147173', 'dev', 'md', 'IIS Share' ),
    ( 'AL9997', 'dev', 'or', 'IIS Share' ),
    ( 'ALERT', 'dev', 'or', 'IIS Share' ),
    ( 'AS0000', 'dev', 'as', 'IIS Share' ),
    ( 'ASIIS', 'dev', 'az', 'IIS Share' ),
    ( 'CDPHE', 'dev', 'co', 'IIS Share' ),
    ( 'CHIRPPRD', 'dev', 'in', 'IIS Share' ),
    ( 'CIIS', 'dev', 'co', 'IIS Share' ),
    ( 'CT0000', 'dev', 'ct', 'IIS Share' ),
    ( 'CT0000_UI', 'dev', 'ct', 'IIS Share' ),
    ( 'DCIIS', 'dev', 'dc', 'IIS Share' ),
    ( 'DE0000', 'dev', 'de', 'IIS Share' ),
    ( 'DE0000_UI', 'dev', 'de', 'IIS Share' ),
    ( 'dn1fro00', 'dev', 'wa', 'IIS Share' ),
    ( 'FLSHOTS', 'dev', 'fl', 'IIS Share' ),
    ( 'FM0000', 'dev', 'fm', 'IIS Share' ),
    ( 'GRITS', 'dev', 'ga', 'IIS Share' ),
    ( 'GU0000', 'dev', 'gu', 'IIS Share' ),
    ( 'ICARE', 'dev', 'il', 'IIS Share' ),
    ( 'IMMPACT', 'dev', 'me', 'IIS Share' ),
    ( 'IMMTRAX', 'dev', 'mt', 'IIS Share' ),
    ( 'IMMUNET', 'dev', 'md', 'IIS Share' ),
    ( 'IMMUNETS', 'dev', 'md', 'IIS Share' ),
    ( 'ImpactSIIS', 'dev', 'oh', 'IIS Share' ),
    ( 'IRIS', 'dev', 'id', 'IIS Share' ),
    ( 'IRISIA', 'dev', 'ia', 'IIS Share' ),
    ( 'IRISID', 'dev', 'id', 'IIS Share' ),
    ( 'KS0000', 'dev', 'ks', 'IIS Share' ),
    ( 'KY0000_UI', 'dev', 'ky', 'IIS Share' ),
    ( 'LA0000', 'dev', 'la', 'IIS Share' ),
    ( 'LA0000_UI', 'dev', 'la', 'IIS Share' ),
    ( 'LALinks', 'dev', 'la', 'IIS Share' ),
    ( 'MCIR', 'dev', 'mi', 'IIS Share' ),
    ( 'MH0000', 'dev', 'mh', 'IIS Share' ),
    ( 'MICHIGAN', 'dev', 'mi', 'IIS Share' ),
    ( 'MIIC', 'dev', 'mn', 'IIS Share' ),
    ( 'MIIS', 'dev', 'ma', 'IIS Share' ),
    ( 'MIIX', 'dev', 'ms', 'IIS Share' ),
    ( 'MIIXHL7', 'dev', 'ms', 'IIS Share' ),
    ( 'MODHSS', 'dev', 'mo', 'IIS Share' ),
    ( 'MP0000', 'dev', 'mp', 'IIS Share' ),
    ( 'NCIR', 'dev', 'nc', 'IIS Share' ),
    ( 'NESIIS', 'dev', 'ne', 'IIS Share' ),
    ( 'NHIIS', 'dev', 'nh', 'IIS Share' ),
    ( 'NJDOH', 'dev', 'nj', 'IIS Share' ),
    ( 'NJIIS', 'dev', 'nj', 'IIS Share' ),
    ( 'NMSIIS', 'dev', 'nm', 'IIS Share' ),
    ( 'NMSIIS_UI', 'dev', 'nm', 'IIS Share' ),
    ( 'NV0000', 'dev', 'nv', 'IIS Share' ),
    ( 'NV0000_UI', 'dev', 'nv', 'IIS Share' ),
    ( 'NYCDOHMH', 'dev', 'nyc', 'IIS Share' ),
    ( 'NYSIIS', 'dev', 'ny', 'IIS Share' ),
    ( 'OHSIIS', 'dev', 'oh', 'IIS Share' ),
    ( 'OK0000', 'dev', 'ok', 'IIS Share' ),
    ( 'OK0000_UI', 'dev', 'ok', 'IIS Share' ),
    ( 'PH0000', 'dev', 'ph', 'IIS Share' ),
    ( 'PH0000_UI', 'dev', 'ph', 'IIS Share' ),
    ( 'PREIS', 'dev', 'pr', 'IIS Share' ),
    ( 'PRIIS', 'dev', 'pr', 'IIS Share' ),
    ( 'PU0000', 'dev', 'pu', 'IIS Share' ),
    ( 'RIA', 'dev', 'ri', 'IIS Share' ),
    ( 'SDIIS', 'dev', 'sd', 'IIS Share' ),
    ( 'SHOWMEVAX', 'dev', 'mo', 'IIS Share' ),
    ( 'SIMON', 'dev', 'sc', 'IIS Share' ),
    ( 'TENNIIS', 'dev', 'tn', 'IIS Share' ),
    ( 'TNIIS', 'dev', 'tn', 'IIS Share' ),
    ( 'TxDSHS', 'dev', 'tx', 'IIS Share' ),
    ( 'TxImmTrac', 'dev', 'tx', 'IIS Share' ),
    ( 'USVIIIS', 'dev', 'vi', 'IIS Share' ),
    ( 'VIIS', 'dev', 'va', 'IIS Share' ),
    ( 'WADOHIIS', 'dev', 'wa', 'IIS Share' ),
    ( 'WAIIS', 'dev', 'wa', 'IIS Share' ),
    ( 'WIA', 'dev', 'wi', 'IIS Share' ),
    ( 'WIR', 'dev', 'wi', 'IIS Share' ),
    ( 'WVIIS', 'dev', 'wv', 'IIS Share' ),
    ( 'WVSIIS', 'dev', 'wv', 'IIS Share' ),
    ( 'WYIR', 'dev', 'wy', 'IIS Share' );