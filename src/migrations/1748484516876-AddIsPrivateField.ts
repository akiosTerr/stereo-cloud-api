import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class AddIsPrivateField1748484516876 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'videos',
            new TableColumn({
                name: 'isPrivate',
                type: 'boolean',
                default: false,
                isNullable: false,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('videos', 'isPrivate');
    }
}
        