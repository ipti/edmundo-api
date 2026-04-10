ALTER TABLE `classroom`
ADD COLUMN `idClassroomMeuBen` INTEGER NULL,
ADD UNIQUE INDEX `classroom_idClassroomMeuBen_key`(`idClassroomMeuBen`);
