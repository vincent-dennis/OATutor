import {MASTERY_THRESHOLD} from "../../../config/config.js"

function heuristic(problems, completedProbs, lessonMastery) {

  var chosenProblem = [];
  for (var problem of problems) {
    // Already completed this problem or irrelevant (null if not in learning goals)
    if (completedProbs.has(problem.id) || problem.probMastery == null || problem.probMastery >= MASTERY_THRESHOLD) {
      continue;
    } else if (lessonMastery < 0.6 && problem.steps?.some(step => step.problemType == "Code")) { // if problem contains a "Code" step, then skip if its mastery is < 0.5
      console.log("skipped Code problem with id:" + problem.id + " at current lesson mastery:" + lessonMastery);
      continue;
    } else if (chosenProblem.length === 0 || chosenProblem[0].probMastery > problem.probMastery) {
      chosenProblem = [problem];
    } else if (chosenProblem.length > 0 && chosenProblem[0].probMastery === problem.probMastery) {
      chosenProblem.push(problem);
    }
  }
  // Choose random from problems with equal mastery
  return chosenProblem[Math.floor(Math.random() * chosenProblem.length)];
}

export { heuristic };
