// script para forçar atualizar a senha do Administrador de teste
// USAGE: dentro de my-app: node .\scripts\set-admin-pass.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

(async function main() {
  const prisma = new PrismaClient();
  try {
    const email = process.env.TEST_ADMIN_EMAIL || "admin@exemplo.com";
    const senha = process.env.TEST_ADMIN_PASS || "senha123";
    const hash = bcrypt.hashSync(senha, 10);

    const result = await prisma.administrador.updateMany({
      where: { email: email.toLowerCase() },
      data: { senha: hash },
    });

    if (result.count > 0) {
      console.log("Senha atualizada para", email, "->", senha);
    } else {
      console.log("Nenhum administrador encontrado com email", email);
    }
  } catch (err) {
    console.error("erro ao atualizar senha:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
