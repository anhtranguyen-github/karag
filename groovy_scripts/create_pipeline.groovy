import jenkins.model.*
import jenkins.branch.*
import jenkins.plugins.git.*
import org.jenkinsci.plugins.workflow.multibranch.*
import com.cloudbees.hudson.plugins.folder.*

def jenkins = Jenkins.getInstance()

// Create folder
def folderName = "Projects"
def folder = jenkins.getItem(folderName)
if (folder == null) {
    folder = jenkins.createProject(Folder.class, folderName)
    println "Created folder: ${folderName}"
}

// Create multibranch pipeline
def pipelineName = "karag-multibranch"
def pipeline = folder.getItem(pipelineName)
if (pipeline == null) {
    pipeline = folder.createProject(WorkflowMultiBranchProject.class, pipelineName)
    println "Created multibranch pipeline: ${pipelineName}"
}

// Create Git source using local mount
def gitSource = new GitSCMSource("karag-git", "file:///workspace/karag", "", "*", "", false)

// Add source to pipeline
def sourcesList = pipeline.getSCMSources()
if (sourcesList.isEmpty()) {
    sourcesList.add(gitSource)
    println "Added Git source to pipeline"
} else {
    sourcesList.set(0, gitSource)
    println "Updated Git source in pipeline"
}

// Save configuration
pipeline.save()
folder.save()

println "Multibranch pipeline '${pipelineName}' configured successfully!"
println "URL: ${jenkins.getRootUrl()}job/${folderName}/job/${pipelineName}/"
println "Pipeline will auto-detect Jenkinsfile from repository branches."
