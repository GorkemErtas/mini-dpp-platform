using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniDpp.Infrastructure.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Models",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Models", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Batches",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Gtin = table.Column<string>(type: "TEXT", maxLength: 14, nullable: false),
                ModelId = table.Column<int>(type: "INTEGER", nullable: false),
                Number = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Cotton = table.Column<string>(type: "TEXT", nullable: false),
                Elastane = table.Column<string>(type: "TEXT", nullable: false),
                Location = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Carbon = table.Column<string>(type: "TEXT", nullable: false),
                Version = table.Column<int>(type: "INTEGER", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Batches", x => x.Id);
                table.CheckConstraint("CK_Batches_Gtin", "length(Gtin) = 14 AND Gtin NOT GLOB '*[^0-9]*'");
                table.CheckConstraint("CK_Batches_Version", "Version >= 1");
                table.ForeignKey(
                    name: "FK_Batches_Models_ModelId",
                    column: x => x.ModelId,
                    principalTable: "Models",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "Revisions",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                BatchId = table.Column<int>(type: "INTEGER", nullable: false),
                Version = table.Column<int>(type: "INTEGER", nullable: false),
                ChangedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                Gtin = table.Column<string>(type: "TEXT", maxLength: 14, nullable: false),
                ModelName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                BatchNumber = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Cotton = table.Column<string>(type: "TEXT", nullable: false),
                Elastane = table.Column<string>(type: "TEXT", nullable: false),
                Location = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Carbon = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Revisions", x => x.Id);
                table.ForeignKey(
                    name: "FK_Revisions_Batches_BatchId",
                    column: x => x.BatchId,
                    principalTable: "Batches",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Batches_Gtin",
            table: "Batches",
            column: "Gtin",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Batches_ModelId_Number",
            table: "Batches",
            columns: new[] { "ModelId", "Number" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Models_Name",
            table: "Models",
            column: "Name",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Revisions_BatchId_Version",
            table: "Revisions",
            columns: new[] { "BatchId", "Version" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Revisions");

        migrationBuilder.DropTable(
            name: "Batches");

        migrationBuilder.DropTable(
            name: "Models");
    }
}
