-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('PLUGGED', 'UNPLUGGED');

-- CreateTable
CREATE TABLE "Administrador" (
    "idAdm" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("idAdm")
);

-- CreateTable
CREATE TABLE "Professor" (
    "idProfessor" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("idProfessor")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "idAluno" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("idAluno")
);

-- CreateTable
CREATE TABLE "Turma" (
    "idTurma" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "professorId" INTEGER NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("idTurma")
);

-- CreateTable
CREATE TABLE "TurmaAluno" (
    "idTurma" INTEGER NOT NULL,
    "idAluno" INTEGER NOT NULL,

    CONSTRAINT "TurmaAluno_pkey" PRIMARY KEY ("idTurma","idAluno")
);

-- CreateTable
CREATE TABLE "AtividadeArquivo" (
    "idArquivo" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "tipoArquivo" TEXT,
    "atividadeId" INTEGER NOT NULL,

    CONSTRAINT "AtividadeArquivo_pkey" PRIMARY KEY ("idArquivo")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "idAtividade" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoAtividade" NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "professorId" INTEGER,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "script" TEXT,
    "linguagem" TEXT,
    "wasmUrl" TEXT,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("idAtividade")
);

-- CreateTable
CREATE TABLE "AtividadeTurma" (
    "idAtividadeTurma" SERIAL NOT NULL,
    "idAtividade" INTEGER NOT NULL,
    "idTurma" INTEGER NOT NULL,
    "idProfessor" INTEGER,
    "dataAplicacao" TIMESTAMP(3),

    CONSTRAINT "AtividadeTurma_pkey" PRIMARY KEY ("idAtividadeTurma")
);

-- CreateTable
CREATE TABLE "Alternativa" (
    "idAlternativa" SERIAL NOT NULL,
    "idAtividade" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "correta" BOOLEAN NOT NULL,

    CONSTRAINT "Alternativa_pkey" PRIMARY KEY ("idAlternativa")
);

-- CreateTable
CREATE TABLE "RespostaAlunoAtividade" (
    "idResposta" SERIAL NOT NULL,
    "idAluno" INTEGER NOT NULL,
    "idAtividade" INTEGER NOT NULL,
    "respostaTexto" TEXT,
    "idAlternativaEscolhida" INTEGER,
    "notaObtida" DOUBLE PRECISION,
    "feedback" TEXT,
    "dataAplicacao" TIMESTAMP(3),

    CONSTRAINT "RespostaAlunoAtividade_pkey" PRIMARY KEY ("idResposta")
);

-- CreateTable
CREATE TABLE "AtividadeProfessor" (
    "id" SERIAL NOT NULL,
    "idAtividade" INTEGER NOT NULL,
    "idProfessor" INTEGER NOT NULL,
    "dataVinculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtividadeProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealizacaoPlugged" (
    "id" SERIAL NOT NULL,
    "idAtividade" INTEGER NOT NULL,
    "idAluno" INTEGER,
    "idTurma" INTEGER,
    "seed" INTEGER NOT NULL,
    "correctValue" INTEGER NOT NULL,
    "selectedValue" INTEGER,
    "notaObtida" INTEGER,
    "dataAplicacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealizacaoPlugged_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_email_key" ON "Administrador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_email_key" ON "Professor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_email_key" ON "Aluno"("email");

-- CreateIndex
CREATE INDEX "AtividadeTurma_idAtividade_idx" ON "AtividadeTurma"("idAtividade");

-- CreateIndex
CREATE INDEX "AtividadeTurma_idTurma_idx" ON "AtividadeTurma"("idTurma");

-- CreateIndex
CREATE INDEX "AtividadeTurma_idProfessor_idx" ON "AtividadeTurma"("idProfessor");

-- CreateIndex
CREATE INDEX "AtividadeProfessor_idAtividade_idx" ON "AtividadeProfessor"("idAtividade");

-- CreateIndex
CREATE INDEX "AtividadeProfessor_idProfessor_idx" ON "AtividadeProfessor"("idProfessor");

-- CreateIndex
CREATE UNIQUE INDEX "AtividadeProfessor_idAtividade_idProfessor_key" ON "AtividadeProfessor"("idAtividade", "idProfessor");

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("idProfessor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaAluno" ADD CONSTRAINT "TurmaAluno_idTurma_fkey" FOREIGN KEY ("idTurma") REFERENCES "Turma"("idTurma") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaAluno" ADD CONSTRAINT "TurmaAluno_idAluno_fkey" FOREIGN KEY ("idAluno") REFERENCES "Aluno"("idAluno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeArquivo" ADD CONSTRAINT "AtividadeArquivo_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("idAtividade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("idProfessor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeTurma" ADD CONSTRAINT "AtividadeTurma_idAtividade_fkey" FOREIGN KEY ("idAtividade") REFERENCES "Atividade"("idAtividade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeTurma" ADD CONSTRAINT "AtividadeTurma_idTurma_fkey" FOREIGN KEY ("idTurma") REFERENCES "Turma"("idTurma") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeTurma" ADD CONSTRAINT "AtividadeTurma_idProfessor_fkey" FOREIGN KEY ("idProfessor") REFERENCES "Professor"("idProfessor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternativa" ADD CONSTRAINT "Alternativa_idAtividade_fkey" FOREIGN KEY ("idAtividade") REFERENCES "Atividade"("idAtividade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaAlunoAtividade" ADD CONSTRAINT "RespostaAlunoAtividade_idAluno_fkey" FOREIGN KEY ("idAluno") REFERENCES "Aluno"("idAluno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaAlunoAtividade" ADD CONSTRAINT "RespostaAlunoAtividade_idAtividade_fkey" FOREIGN KEY ("idAtividade") REFERENCES "Atividade"("idAtividade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaAlunoAtividade" ADD CONSTRAINT "RespostaAlunoAtividade_idAlternativaEscolhida_fkey" FOREIGN KEY ("idAlternativaEscolhida") REFERENCES "Alternativa"("idAlternativa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeProfessor" ADD CONSTRAINT "AtividadeProfessor_idAtividade_fkey" FOREIGN KEY ("idAtividade") REFERENCES "Atividade"("idAtividade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeProfessor" ADD CONSTRAINT "AtividadeProfessor_idProfessor_fkey" FOREIGN KEY ("idProfessor") REFERENCES "Professor"("idProfessor") ON DELETE RESTRICT ON UPDATE CASCADE;
