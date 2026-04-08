function splitLines(content = "") {
  if (!content) {
    return [];
  }

  return content.split("\n");
}

export function diffLines(previousContent = "", currentContent = "") {
  const previous = splitLines(previousContent);
  const current = splitLines(currentContent);
  const matrix = Array.from({ length: previous.length + 1 }, () =>
    Array(current.length + 1).fill(0),
  );

  for (let row = 1; row <= previous.length; row += 1) {
    for (let column = 1; column <= current.length; column += 1) {
      if (previous[row - 1] === current[column - 1]) {
        matrix[row][column] = matrix[row - 1][column - 1] + 1;
      } else {
        matrix[row][column] = Math.max(matrix[row - 1][column], matrix[row][column - 1]);
      }
    }
  }

  const operations = [];
  let row = previous.length;
  let column = current.length;

  while (row > 0 && column > 0) {
    if (previous[row - 1] === current[column - 1]) {
      operations.push({
        type: "context",
        oldNumber: row,
        newNumber: column,
        content: current[column - 1],
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (matrix[row - 1][column] >= matrix[row][column - 1]) {
      operations.push({
        type: "removed",
        oldNumber: row,
        newNumber: null,
        content: previous[row - 1],
      });
      row -= 1;
      continue;
    }

    operations.push({
      type: "added",
      oldNumber: null,
      newNumber: column,
      content: current[column - 1],
    });
    column -= 1;
  }

  while (row > 0) {
    operations.push({
      type: "removed",
      oldNumber: row,
      newNumber: null,
      content: previous[row - 1],
    });
    row -= 1;
  }

  while (column > 0) {
    operations.push({
      type: "added",
      oldNumber: null,
      newNumber: column,
      content: current[column - 1],
    });
    column -= 1;
  }

  return operations.reverse();
}
