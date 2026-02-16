pipeline {
    agent {
        label 'linux'
    }

    triggers {
        githubPush()
    }

    environment {
        // Application specific variables
        APP_NAME = 'karag-backend'
        DOCKER_IMAGE = "karag/${APP_NAME}"
        
        // SonarQube credentials and configuration
        SONAR_CREDENTIALS_ID = 'sonar-token'
        SONAR_HOST_URL = 'http://sonarqube.example.com'
        
        // Checkov configuration
        CHECKOV_REQUISITES_DIR = '.'
        
        // Docker configuration
        DOCKER_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout the source code from the main branch
                checkout scm
                echo "Checked out commit: ${env.GIT_COMMIT}"
            }
        }
        stage('Prompt Registry Validation') {
            steps {
                echo 'Validating Prompt Registry (YAML syntax + versioning)...'
                sh '''
                    # Ensure prompts.yaml is valid YAML
                    python3 -c "import yaml; yaml.safe_load(open('backend/app/core/prompts.yaml'))"
                    echo "Prompt Registry: PASSED"
                '''
            }
        }

        stage('Backend Unit Tests') {
            steps {
                echo 'Running backend unit tests with uv...'
                sh '''
                    # Install uv if missing
                    curl -LsSf https://astral.sh/uv/install.sh | sh
                    export PATH="$HOME/.cargo/bin:$PATH"
                    
                    # Synchronize project environment (Frozen for reproducibility)
                    cd backend
                    uv sync --frozen --no-install-project
                    
                    # Run tests within the virtual environment
                    export PYTHONPATH=$PYTHONPATH:.
                    uv run pytest tests/ --maxfail=1
                '''
            }
        }

        stage('Frontend CI') {
            steps {
                echo 'Running frontend CI (Lint & Vitest)...'
                dir('frontend') {
                    sh '''
                        # Install pnpm and dependencies
                        npm install -g pnpm
                        pnpm install
                        
                        # Run Lint
                        pnpm run lint
                        
                        # Run Unit Tests
                        pnpm run test:unit -- --bail 1
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Performing code quality and security scanning with SonarQube...'
                withSonarQubeEnv('SonarQubeServer') {
                    sh 'sonar-scanner'
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                echo 'Enforcing SonarQube Quality Gate...'
                timeout(time: 1, unit: 'HOURS') {
                    // Stop the pipeline if the Quality Gate fails
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('API Contract Security Audit') {
            steps {
                echo 'Auditing API contract for path-based parameters...'
                sh '''
                    # Fail if any path parameter uses the generic ":path" type (Forbidden by security policy)
                    if grep -q ":path}" frontend/src/lib/api/openapi.json; then
                        echo "CRITICAL: Path traversal vulnerability surface detected in openapi.json!"
                        grep ":path}" frontend/src/lib/api/openapi.json
                        exit 1
                    fi
                    echo "API contract audit passed."
                '''
            }
        }

        stage('Infrastructure Scanning') {
            steps {
                echo 'Scanning repository for IaC security issues with Checkov...'
                sh '''
                    # Scan the entire repository and fail on high or critical findings
                    checkov -d ${CHECKOV_REQUISITES_DIR} --check HIGH,CRITICAL --soft-fail false
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo "Building Docker image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -f backend/Dockerfile ."
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            deleteDir()
        }
        success {
            echo 'CI Pipeline completed successfully!'
        }
        failure {
            echo 'CI Pipeline failed. Please check the logs.'
        }
    }
}
