ALTER TABLE `registration`
ADD COLUMN `idRegistrationMeuBen` INTEGER NULL,
ADD INDEX `registration_idRegistrationMeuBen_idx`(`idRegistrationMeuBen`);
