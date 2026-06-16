pipeline {
     agent {
         label 'nextjs'
     }
     stages {
        stage("Collecting Requirements") {
            steps {
                sh "sudo docker compose up --build -d"   
                sh "echo aiagent.mobiloitte.io"
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('mobiloitte-sonar') {
                    script {
                        def scannerHome = tool 'mobiloitte-sonar-scanner';
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                // Update BUILD_STATUS based on build result
                def buildOutcome = currentBuild.result == null || currentBuild.result == 'SUCCESS' ? 'SUCCESS' : 'FAILURE'
                def buildStatus = buildOutcome

                emailext attachLog: true, body: """<html>
                    <head>
                        <style>
                            .build-status {
                                color: ${buildStatus == 'SUCCESS' ? 'green' : 'red'};
                            }
                        </style>
                    </head>
                    <body>
                        <p>Hello,</p>
                        <b><p>This notification is to inform you about your project's build has been ${buildStatus}.</p></b>
                        <ul>
                            <li><strong>Project Name:</strong> ${env.PROJECT_NAME}</li>
                            <li><strong>Build Number:</strong> ${env.BUILD_NUMBER}</li>
                            <li><strong>Build Status:</strong> <span class="build-status">${buildStatus}</span></li>
                            <li><strong>Build Log:</strong> <p>Attached Below</p></li>
                        </ul>
                    </body>
                </html>""", subject: 'PROJECT BUILD STATUS via JENKINS', to: 'team-it@mobiloitte.com ,tushar.singh@mobiloitte.com , vishal.kumar@mobiloitte.com', mimeType: 'text/html'
            }
        }
    }
}




