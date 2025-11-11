/*pipeline {
    agent {
        label 'servidor-desarrollo'
    }

    environment {
        DEPLOY_USER = 'root'
        DEPLOY_HOST = '93.127.210.103'
        DEPLOY_PATH = '/var/www/html/sigmi/sigmig_backend'
        BRANCH = 'dev'
        REPO_URL = "https://github.com/grangel1987/sigmig_backend.git"
        NO_CHANGES_CODE = '99'
        MIGRATION_FAILED = 'false'
        NOTIFY_SLACK = 'false' // Cambiar a 'true' para habilitar notificaciones
    }

    stages {
        stage('Verificar Cambios') {
            steps {
                sshagent(credentials: ['devops_server']) {
                    script {
                        def checkChangesScript = """
                            #!/bin/bash
                            set -euo pipefail
                            cd ${DEPLOY_PATH}
                            git fetch origin ${BRANCH}
                            CHANGES=\$(git diff --name-only HEAD origin/${BRANCH})

                            if [ -z "\$CHANGES" ]; then
                                exit ${NO_CHANGES_CODE}
                            fi
                        """

                        def statusCode = sh(
                            script: """
                                ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '/bin/bash -s' <<'EOF'
${checkChangesScript}
EOF
                            """,
                            returnStatus: true
                        )

                        if (statusCode == env.NO_CHANGES_CODE.toInteger()) {
                            env.DEPLOY_STATUS = 'NO_CHANGES'
                            return
                        }
                        env.DEPLOY_STATUS = 'CHANGES_DETECTED'
                    }
                }
            }
        }

        stage('Desplegar Cambios') {
            options {
                timeout(time: 15, unit: 'MINUTES')
            }
            when {
                expression { env.DEPLOY_STATUS == 'CHANGES_DETECTED' }
            }
            steps {
                sshagent(credentials: ['devops_server']) {
                    script {
                        def deployScript = """#!/bin/bash
                            set -euo pipefail
                            cd ${DEPLOY_PATH}
                            git fetch origin ${BRANCH}
                            git reset --hard origin/${BRANCH}
                            git clean -fd
                            echo "::COMMIT_AUTHOR::\$(git log -1 --pretty=format:'%an')"
                            echo "::COMMIT_MSG::\$(git log -1 --pretty=format:'%s')"
                            echo "::FILES_CHANGED::\$(git diff --name-only HEAD^ HEAD)"
                            npm install
                            npm run build
                            cp .env build/
                            pm2 restart 0
                            echo "::MIGRATION_FAILED::false"
                        """

                        def fullOutput = sh(
                            script: """
                                ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} '/bin/bash -s' <<'EOF'
${deployScript}
EOF
                            """,
                            returnStdout: true
                        ).trim()
                        
                        processDeployOutput(fullOutput)
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Resultado final del pipeline: ${currentBuild.result}"
                echo "Estado del despliegue: ${env.DEPLOY_STATUS}"
                echo "Estado de migración: ${env.MIGRATION_FAILED}"
            }
        }

        success {
            script {
                if (env.NOTIFY_SLACK == 'true') {
                    if (env.DEPLOY_STATUS == 'NO_CHANGES') {
                        slackSend(
                            channel: 'C08TNQUU9A7',
                            color: '#FFFF00',
                            message: ":double_vertical_bar: No hay cambios en la rama *${BRANCH}*. Despliegue omitido.",
                            tokenCredentialId: 'Token-Slack',
                            botUser: true,
                            failOnError: false
                        )
                    } else if (env.MIGRATION_FAILED == 'false') {
                        def filesCount = env.FILES_CHANGED_COUNT ?: '0'
                        def filesChanged = env.FILES_CHANGED ?: 'No disponible'

                        def allFiles = (filesChanged ?: '').split('\n').findAll { it?.trim() }

                        if (filesCount.isNumber() && filesCount.toInteger() > 10) {
                            filesChanged = allFiles.take(10).join('\n') +
                                "\n... y otros ${filesCount.toInteger() - 10} archivos más"
                        } else {
                            filesChanged = allFiles.join('\n')
                        }

                        slackSend(
                            channel: 'C08TNQUU9A7',
                            color: '#36a64f',
                            message: """:white_check_mark: Despliegue exitoso en *${BRANCH}*
:bust_in_silhouette: *Autor:* ${env.COMMIT_AUTHOR}
:speech_balloon: *Mensaje:* ${env.COMMIT_MSG}
:file_folder: *Archivos modificados (${filesCount}):*
${filesChanged}""",
                            tokenCredentialId: 'Token-Slack',
                            botUser: true,
                            failOnError: false
                        )
                    }
                }
            }
        }

        failure {
            script {
                def errorMessage = ":x: Error en el pipeline de Jenkins en *${BRANCH}*"

                if (env.MIGRATION_FAILED == 'true') {
                    errorMessage += "\n:basecamp: *Error en migración de base de datos*"
                    errorMessage += "\n:bust_in_silhouette: Autor: ${env.COMMIT_AUTHOR ?: 'No disponible'}"
                    errorMessage += "\n:page_facing_up: Posible solución: Verificar el archivo de migración 1748958988082_currencies_make_code_field_uniques.ts"
                }

                errorMessage += "\n📄 Ver detalles: ${BUILD_URL}console"

                if (env.NOTIFY_SLACK == 'true') {
                    slackSend(
                        channel: 'C08TNQUU9A7',
                        color: 'danger',
                        message: errorMessage,
                        tokenCredentialId: 'Token-Slack',
                        botUser: true,
                        failOnError: false
                    )
                }
            }
        }
    }
}

def processDeployOutput(output) {
    env.COMMIT_AUTHOR = extractFromOutput(output, 'COMMIT_AUTHOR') ?: 'No disponible'
    env.COMMIT_MSG = extractFromOutput(output, 'COMMIT_MSG') ?: 'No disponible'
    env.FILES_CHANGED_COUNT = extractFromOutput(output, 'FILES_CHANGED')?.split('\n')?.size() ?: 0
    env.FILES_CHANGED = extractFromOutput(output, 'FILES_CHANGED') ?: 'No se detectaron archivos modificados'
    env.MIGRATION_FAILED = extractFromOutput(output, 'MIGRATION_FAILED') ?: 'false'

    echo "📌 Info extraída:"
    echo "Autor: ${env.COMMIT_AUTHOR}"
    echo "Mensaje: ${env.COMMIT_MSG}"
    echo "Archivos modificados (${env.FILES_CHANGED_COUNT}):"
    echo env.FILES_CHANGED
    echo "Migración fallida: ${env.MIGRATION_FAILED}"
}

def extractFromOutput(String output, String type) {
    try {
        def marker = "::${type}::"
        if (output.contains(marker)) {
            def start = output.indexOf(marker) + marker.length()
            def end = output.indexOf('\n', start)
            if (end == -1) end = output.length()
            return output.substring(start, end).trim()
        }
        return null
    } catch (Exception e) {
        echo "⚠️ Error extrayendo ${type}: ${e.message}"
        return null
    }
*/
