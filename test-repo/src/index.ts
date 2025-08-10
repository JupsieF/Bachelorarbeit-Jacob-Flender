import mainWorkflow from './workflow/mainWorkflow';

// Start des Workflows
mainWorkflow().catch(error => {
  console.error("An error occurred during the workflow execution:", error);
});

