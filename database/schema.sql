CREATE USER 'testPhiz'@'%' IDENTIFIED BY 'testPhizPass@1';
GRANT ALL PRIVILEGES ON * . * TO 'testPhiz'@'%';
FLUSH PRIVILEGES;


CREATE DATABASE IF NOT EXISTS `phiz`;
commit;

USE phiz;

commit;
--
-- DROP TABLE destinations if exists;
--
DROP TABLE IF EXISTS destinations;

--
-- CREATE TABLE destinations;
--

-- destinations stores the information needed to make SOAP Requests to an IIS
CREATE TABLE destinations (
	-- The destination id, usually the FIPS STATE Code, but may also have a value for other jurisdictions (e.g., Philadelphia, New York City)
    dest_id character varying(128) NOT NULL,
    -- The endpoint URI for SOAP calls to the jurisdiction
    dest_uri character varying(1024) NOT NULL,
    -- The username for IZGateway for this destination
    username character varying(50),
    -- The password for IZGateway for this destination
    password character varying(50),
    -- The WSDL Version to use for this destination
    facility_id character varying(50),
    -- The facility Id to use for this destination
    MSH3 character varying(50),
    -- The MSH-3 for this destination
    MSH4 character varying(50),
    -- The MSH-4 for this destination
    MSH5 character varying(50),
    -- The MSH-5 for this destination
    MSH6 character varying(50),
    -- The MSH-6 for this destination
    MSH22 character varying(50),
    -- The MSH-22 for this destination
    RXA11 character varying(50),
    -- The RXA-11 for this destination
    dest_version character varying(50),
    -- True if the MOU with the IIS has been signed between APHL and the destination jurisdiction
    signed_mou boolean DEFAULT false NOT NULL,
    -- Password expiry date
    pass_expiry date,
    -- Destination type 
    dest_type int NOT NULL,
    PRIMARY KEY (dest_id),
    KEY `FK_DEST_TYPE_idx` (dest_type)
);

--
-- DROP TABLE destination_type if exists;
--

DROP TABLE IF EXISTS destination_type;
--
-- CREATE TABLE destination_type;
--

CREATE TABLE destination_type (
  type_id int NOT NULL,
  type varchar(45) DEFAULT NULL,
  PRIMARY KEY (type_id)
);

--
-- DROP TABLE endpointstatus if exists;
--
DROP TABLE IF EXISTS endpointstatus;
--
-- CREATE TABLE endpointstatus;
--
CREATE TABLE endpointstatus (
  id int NOT NULL AUTO_INCREMENT,
  status character varying(45) DEFAULT NULL,
  detail character varying(500) DEFAULT NULL,
  retry_strategy character varying(500) DEFAULT NULL,
  diagnostics character varying(500) DEFAULT NULL,
  dest_id character varying(128) DEFAULT NULL,
  ran_at datetime NOT NULL,
  PRIMARY KEY (id)
);

--
-- DROP TABLE jurisdiction if exists;
--
DROP TABLE IF EXISTS jurisdiction;
--
-- CREATE TABLE jurisdiction;
--
CREATE TABLE jurisdiction (
  name character varying(64) NOT NULL,
  description character varying(48) NOT NULL,
  dest_id character varying(128) DEFAULT NULL,
  PRIMARY KEY (name)
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

CREATE TABLE audit_history (
  id          INT         NOT NULL AUTO_INCREMENT,
  tableName   VARCHAR(50) NOT NULL,
  userName    VARCHAR(50) NOT NULL,
  changeType  ENUM('Insert', 'Update', 'Delete') NOT NULL,
  oldValues   VARCHAR(1024)        NULL,
  newValues   VARCHAR(1024)        NULL,
  createdAt   DATETIME    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
--
-- DROP TABLE accesscontrol if exists;
--
DROP TABLE IF EXISTS accesscontrol;

--
-- CREATE TABLE accesscontrol;
--

-- A table indicating the access allowed between a source and
-- destination.
CREATE TABLE accesscontrol (
    souceid character varying(16),
    destid character varying(16)
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
-- TRUNCATE DATA FROM TABLE destinations;
--
TRUNCATE destinations;

--
-- INSERT INTO TABLE destinations;
--

INSERT INTO destinations(dest_id, dest_uri, username, password, facility_id, MSH3, MSH4, MSH5, MSH6, MSH22, RXA11, dest_version, signed_mou, pass_expiry, dest_type) VALUES
	('aira','https://florence.immregistries.org/iis-sandbox/soappp','IZgtwy','IZgtwy','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,'2023-07-12',1),
	('404','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/NotFound','NOT_FOUND_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','',0,'2023-07-12',2),
	('devwup','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','','','IZGW','IZGW','IZGW','IZGW','IZGW','','','',0,'2023-07-12',2),
	('dev','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','user','pass','IZGW','IZGW','IZGW','TEST','TC_04','','','2014',0,'2023-07-12',1),
	('dev2011','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/client_Service','user','pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,'2023-07-12',1),
	('down','https://192.0.2.0/dev/IISService','NON_RESPONDING_IP_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','',0,'2023-07-12',1),
	('invalid','https://iis.invalid','NON_DNS_RESOLVABLE_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','',0,'2023-07-12',1),
	('reject','https://localhost:12345/dev/IISService','REJECTING_ENDPOINT','NONE','IZGW','IZGW','IZGW','IZGW','IZGW','','','',0,'2023-07-12',1),
	('ak','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','AK_IZ_GATEWAY_TEST_HL7','Pass','SIISCLIENT10704','VacTrAK','AKIIS','AK','VacTrAK','AKIIS','SIIS10543','2011',0,NULL,2),
	('ar','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('as','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('az','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATEWAY_69002_HL7','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ca','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('casd','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','sdirgateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('casj','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('co','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ct','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('dc','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','Immzgateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('de','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('fl','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HNK14066','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('fm','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ga','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','GAIZUser','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('gu','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','n',0,NULL,2),
	('ia','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','cdc.gov','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('id','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','izgatewaytest','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('il','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','TESTICAREX2','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('in','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','INIZGATEWAYHL7','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('ks','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ky','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('la','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','ONCHUB-LA','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2014',0,NULL,2),
	('ma','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','ccghlsevenqa','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('md','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','ImmuNet-IZ-Gateway-TST','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('me','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','izgateway.dex','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('mh','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','=B.4-Q%u',0,NULL,2),
	('mn','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','iMmrj1sTR385gAeTz','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('mo','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('mp','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('ms','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','ONCHUB-MS','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2014',0,NULL,2),
	('mt','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('nc','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','C1489C154617B06C','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('nd','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','BDC00076','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ne','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','DHHSC','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('nh','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('nj','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','EIN883314708','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('nm','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('nv','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ny_qbp','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','','','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('ny_test','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','','','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('ny_vxu','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','','','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('nyc','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATEWAYTEST','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('oh','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZ.GATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('or_dev','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','onchub',NULL,'IZGW','IZGW','IZGW','IZGW','IZGW','','','onchub',0,NULL,1),
	('or_trn','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','onchub',NULL,'IZGW','IZGW','IZGW','IZGW','IZGW','','','onchub',0,NULL,1),
	('or_uat','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','onchub',NULL,'IZGW','IZGW','IZGW','IZGW','IZGW','','','onchub',0,NULL,1),
	('ph','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('pr','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','Covpan','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('pw','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('ri','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HXRT4Z53','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('sc','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7_IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','^8:MvEP',0,NULL,2),
	('test','https://98.22.184.181:4444','IZGateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('tn','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATEWAY','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('tx','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATE','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('tx_uat','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGATE','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('ut','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','izgateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('va','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','izgatewayuser','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,1),
	('wa','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZGWATESTHL7','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2014',0,NULL,2),
	('wi','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','IZG','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2011',0,NULL,2),
	('wv','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','ONCHUB-WV','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2014',0,NULL,2),
	('wy','https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService','HL7-AARTtestIZGateway','Pass','IZGW','IZGW','IZGW','IZGW','IZGW','','','2014',0,NULL,1);

--
-- TRUNCATE DATA FROM TABLE jurisdiction;
--
TRUNCATE jurisdiction;

--
-- INSERT INTO TABLE jurisdiction;
--
INSERT INTO jurisdiction VALUES
                             ('AK VacTrAK','Alaska','ak'),
                             ('AL ImmPRINT','Alabama','al'),
                             ('AR WebIZ','Arkansas','ar'),
                             ('AZ ASIIS','Arizona','az'),
                             ('CA CAIR','California','ca'),
                             ('CA RIDE','California - San Joaquin','ca'),
                             ('CA SDIR','California - San Diego','casd'),
                             ('CO CIIS','Colorado','co'),
                             ('CT WiZ','Connecticut','ct'),
                             ('DC DOCIIS','District of Columbia','dc'),
                             ('DE DelVAX','Delaware','de'),
                             ('FL SHOTS','Florida','fl'),
                             ('GA GRITS','Georgia','ga'),
                             ('HI HIR','Hawaii','hi'),
                             ('IA IRIS','Iowa','ia'),
                             ('ID IRIS','Idaho','id'),
                             ('IL I-CARE','Illinois','il'),
                             ('IN CHIRP','Indiana','in'),
                             ('KS WebIZ','Kansas','ks'),
                             ('KY KYIR','Kentucky','ky'),
                             ('LA LINKS','Louisiana','la'),
                             ('MA MIIS','Massachusetts','ma'),
                             ('MD IMMUNET','Maryland','md'),
                             ('ME ImmPact2','Maine','me'),
                             ('MI MCIR','Michigan','mi'),
                             ('MN MIIC','Minnesota','mn'),
                             ('MO ShowMeVax','Missouri','mo'),
                             ('MS MIIX','Mississippi','ms'),
                             ('MT imMTrax','Montana','mt'),
                             ('NCIR','North Carolina','nc'),
                             ('ND SIIS','North Dakota','nd'),
                             ('NE NESIIS','Nebraska','ne'),
                             ('NH VaxNH','New Hampshire','nh'),
                             ('NJ NJIIS','New Jersey','nj'),
                             ('NM NMSIIS','New Mexico','nm'),
                             ('NV WebIZ','Nevada','nv'),
                             ('NY NYSIIS','New York State','ny_qbp'),
                             ('NYC CIR','New York State - New York City','nyc'),
                             ('OH Impact SIIS','Ohio','oh'),
                             ('OK OSIIS','Oklahoma','ok'),
                             ('OR ALERT','Oregon','or'),
                             ('PA PHIL','Pennsylvania - Philadelphia','ph'),
                             ('PA SIIS','Pennsylvania','pa'),
                             ('PI - American Samoa','PI - American Samoa','as'),
                             ('PI - Federated States of Micronesia','PI - Federated States of Micronesia','fm'),
                             ('PI - Palau','PI - Palau','pw'),
                             ('PI - PI Guam','PI - Guam','gu'),
                             ('PI - PI N Mariana Islands','PI - Commonwealth of the Mariana Islands','mp'),
                             ('PI - Republic of the Marshall Islands','PI - Republic of the Marshall Islands','mh'),
                             ('PR PRIR','Puerto Rico','pr'),
                             ('Rhode Island Child and Adult Immunization Registry (RICAIR)','Rhode Island','ri'),
                             ('SC SCI','South Carolina','sc'),
                             ('SD SDIIS','South Dakota','sd'),
                             ('TN TennIIS','Tennessee','tn'),
                             ('TX ImmTrac','Texas','tx'),
                             ('U.S. Virgin Islands','U.S. Virgin Islands','vi'),
                             ('UT USIIS','Utah','ut'),
                             ('VA VIIS','Virginia','va'),
                             ('VT IMR','Vermont','vt'),
                             ('WA WAIIS','Washington','wa'),
                             ('WI WIR','Wisconsin','wi'),
                             ('WV WVSIIS','West Virginia','wv'),
                             ('WY WyIR','Wyoming','wy');

--
-- TRUNCATE DATA FROM TABLE destination_type
--
TRUNCATE destination_type;

--
-- INSERT INTO TABLE destination_type;
--
INSERT INTO `destination_type` VALUES (1,'PRODUCTION'),(2,'TEST');