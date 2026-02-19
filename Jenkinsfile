pipeline {
    agent {
        label 'linux'
    }

    environment {
        // App Identity
        APP_NAME = 'karag'
        
        // Directories
        BACKEND_DIR = 'backend'
        FRONTEND_DIR = 'frontend'
        
        // Tooling config
        UV_PROJECT_ENVIRONMENT = "${WORKSPACE}/${BACKEND_DIR}/.venv"
    }

    stages {
        stage('Step 0: Initialize') {
            steps {
                echo "Initializing workspace for ${env.APP_NAME}..."
                checkout scm
                sh 'mkdir -p results'
            }
        }

        stage('Question 1: Can this code run?') {
            parallel {
                stage('Backend: Environment & Lint') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh '''
                                # Install uv if not present
                                if ! command -v uv &> /dev/null; then
                                    curl -LsSf https://astral.sh/uv/install.sh | sh
                                    export PATH="$HOME/.cargo/bin:$PATH"
                                fi
                                
                                # Synchronize dependencies - verify pyproject.toml / uv.lock consistency
                                uv sync
                                
                                # Fast correctness checks (Linting)
                                # Using uvx for ruff as it is an fast, external tool not in pyproject.toml
                                uvx ruff check .
                                uvx ruff format --check .
                            '''
                        }
                    }
                }
                stage('Frontend: Build & Type Check') {
                    steps {
                        dir(FRONTEND_DIR) {
                            sh '''
                                corepack enable
                                pnpm install --frozen-lockfile
                                
                                # Linting (ESLint)
                                pnpm run lint
                                
                                # Build (Surfaces broken imports, aliases, and type errors)
                                pnpm run build
                            '''
                        }
                    }
                }
            }
        }

        stage('Question 2: Does it behave as intended?') {
            parallel {
                stage('Backend: Unit & Contract') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh '''
                                export PATH="$HOME/.cargo/bin:$PATH"
                                # Run unit and contract tests
                                uv run pytest tests/unit tests/contract \
                                    --junitxml=../results/backend-tests.xml \
                                    --cov=app \
                                    --cov-report=xml:../results/coverage.xml \
                                    --maxfail=3
                            '''
                        }
                    }
                }
                stage('Backend: Integration') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh '''
                                export PATH="$HOME/.cargo/bin:$PATH"
                                # Integration tests often catch runtime graph errors
                                # Note: These should handle their own DB mocks or transient containers
                                uv run pytest tests/integration --junitxml=../results/backend-integration.xml
                            '''
                        }
                    }
                }
                stage('Frontend: Integration (Vitest)') {
                    steps {
                        dir(FRONTEND_DIR) {
                            sh 'pnpm run test:unit'
                        }
                    }
                }
            }
        }

        stage('Question 3: Are there obvious security risks?') {
            parallel {
                stage('Backend: SAST (Bandit)') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh '''
                                export PATH="$HOME/.cargo/bin:$PATH"
                                # Analyze code patterns that already passed build/tests
                                uv run bandit -r app/ -f screen -ll
                            '''
                        }
                    }
                }
                stage('Interface: API Audit') {
                    steps {
                        echo "Auditing API contracts for common security pitfalls..."
                        sh '''
                            # Check for uncontrolled path parameters in OpenAPI spec
                            if grep -q ":path}" frontend/src/lib/api/openapi.json; then
                                echo "ERROR: Path traversal vulnerability surface detected in openapi.json!"
                                exit 1
                            fi
                        '''
                    }
                }
                stage('Backend: Enhanced SAST (Semgrep)') {
                    steps {
                        dir(BACKEND_DIR) {
                            // Using uvx to run semgrep without adding to project deps
                            sh 'uvx semgrep scan --error --config auto .'
                        }
                    }
                }
            }
        }

        stage('Question 4: Are dependencies and artifacts trustworthy?') {
            parallel {
                stage('Supply Chain: uv Audit') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh 'export PATH="$HOME/.cargo/bin:$PATH" && uv lock --check'
                        }
                    }
                }
                stage('Artifact: Docker Build') {
                    steps {
                        echo "Proving the application can be containerized..."
                        sh "docker build --no-cache -t ${env.APP_NAME}:${env.BUILD_ID} -f backend/Dockerfile ."
                    }
                }
            }
        }

        stage('Question 5: Are infrastructure and configs safe?') {
            parallel {
                stage('IaC Scan: Checkov') {
                    steps {
                        dir(BACKEND_DIR) {
                            sh '''
                                export PATH="$HOME/.cargo/bin:$PATH"
                                # Scan Dockerfiles and K8s manifests
                                uv run checkov -d .. --check HIGH,CRITICAL --framework dockerfile,docker_compose,kubernetes --soft-fail false
                            '''
                        }
                    }
                }
                stage('Config: Prompt Validation') {
                    steps {
                        echo "Validating Prompt Registry schemas..."
                        sh 'python3 -c "import yaml; yaml.safe_load(open(\'backend/app/core/prompts.yaml\'))"'
                    }
                }
            }
        }

        stage('Quality Gate: SonarQube') {
            steps {
                echo 'Final code quality report...'
                withSonarQubeEnv('SonarQubeServer') {
                    sh 'sonar-scanner'
                }
                timeout(time: 15, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        always {
            // Collect all test results
            junit allowEmptyResults: true, testResults: 'results/*.xml'
            echo "Pipeline finished. Cleaning workspace..."
            cleanWs()
        }
        success {
            echo "All 5 security/correctness questions answered: YES."
        }
        failure {
            echo "CI Pipeline failed. Check the specific 'Question' stage for details."
        }
    }
}

