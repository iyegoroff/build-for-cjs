#!/usr/bin/env node
const tsmorph = require('ts-morph')
const fs = require('fs')
const path = require('path')
const process = require('process')
const { promisify } = require('util')

const rename = promisify(fs.rename)
const readdir = promisify(fs.readdir)

const cjsImportName = (name) => name.replace(/\.js$/, '.cjs')

const project = new tsmorph.Project({
  tsConfigFilePath: process.argv[2],
})

const checkOutDir = () => {
  const { outDir } = project.compilerOptions.get()

  if (!outDir) {
    throw new Error('specify outDir in tsconfig!')
  }

  return outDir
}

const compile = (outDir) => {
  const errors = project.emitToMemory().getDiagnostics()

  if (errors.length !== 0) {
    throw new Error(project.formatDiagnosticsWithColorAndContext(errors))
  }

  project.compilerOptions.set({
    noEmitOnError: false,
    sourceMap: false,
  })

  project.getSourceFiles().forEach((file) => {
    ;[...file.getImportDeclarations(), ...file.getExportDeclarations()].forEach(
      (decl) => {
        decl.setModuleSpecifier(
          cjsImportName(decl.getModuleSpecifier().getText().replace(/'/g, ''))
        )
      }
    )
  })

  return project.emit().then(() => outDir)
}

const renameImports = (outDir) =>
  readdir(outDir)
    .then((files) =>
      Promise.all(
        files.map((file) => {
          const name = path.join(outDir, file)
          return rename(name, cjsImportName(name))
        })
      )
    )
    .then(() => {
      if (!require(process.argv[3] || process.cwd())) {
        throw new Error('probably broken?')
      }
    })

const handleError = (err) => {
  console.log(err.message)
  process.exitCode = 1
}

Promise.resolve()
  .then(checkOutDir)
  .then(compile)
  .then(renameImports)
  .catch(handleError)
