#!/usr/bin/env node
const tsmorph = require('ts-morph')
const fs = require('fs')
const path = require('path')

const project = new tsmorph.Project({
  tsConfigFilePath: process.argv[1],
})

const folder = project.compilerOptions.get().outDir

if (!folder) {
  throw new Error('specify outDir in tsconfig!')
}

project.compilerOptions.set({
  noEmitOnError: false,
  sourceMap: false,
})

project.getSourceFiles().forEach((file) => {
  ;[...file.getImportDeclarations(), ...file.getExportDeclarations()].forEach(
    (decl) => {
      decl.setModuleSpecifier(
        decl
          .getModuleSpecifier()
          .getText()
          .replace('.js', '.cjs')
          .replace(/'/g, '')
      )
    }
  )
})

project.emit().then(() => {
  fs.readdir(folder, (err, files) => {
    if (!err) {
      files.forEach((file) => {
        const name = path.join(folder, file)
        fs.rename(name, name.replace('.js', '.cjs'), (err) => {
          if (err) {
            throw err
          }
        })
      })
    } else {
      throw err
    }
  })
})
