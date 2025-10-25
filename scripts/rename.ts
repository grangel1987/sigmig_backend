import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project } from 'ts-morph'

const __dirname = dirname(fileURLToPath(import.meta.url))

const project = new Project({
    tsConfigFilePath: resolve(__dirname, '../tsconfig.json'),
})

project.addSourceFilesAtPaths('app/models/**/*.ts')
const modelFiles = project.getSourceFiles('app/models/**/*.ts')

console.log('Matched files:', modelFiles.map(f => f.getFilePath()))

for (const file of modelFiles) {
    let changed = false

    for (const cls of file.getClasses()) {
        for (const prop of cls.getProperties()) {
            const name = prop.getName()
            if (name.includes('_')) {
                const camel = camelCase(name)
                prop.rename(camel)
                changed = true
                console.log(`✔ Renamed ${name} → ${camel} in ${file.getBaseName()}`)
            }
        }
    }

    if (changed) file.saveSync()
}

function camelCase(input: string): string {
    return input.toLowerCase().replace(/[_-]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
}