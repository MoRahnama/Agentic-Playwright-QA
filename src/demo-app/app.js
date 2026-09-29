const form = document.querySelector("#task-form");
const input = document.querySelector("#task-title");
const formStatus = document.querySelector("#form-status");
const list = document.querySelector("#task-list");
const count = document.querySelector("#task-count");
const filterButtons = [...document.querySelectorAll("[data-filter]")];

let tasks = [];
let activeFilter = "all";
let nextId = 1;

function render() {
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "active") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    return true;
  });

  count.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  list.replaceChildren();

  if (visibleTasks.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty";
    emptyState.textContent = tasks.length === 0 ? "No tasks yet. Add one above." : "No tasks in this filter.";
    list.append(emptyState);
    return;
  }

  for (const task of visibleTasks) {
    const item = document.createElement("li");
    item.className = task.completed ? "task completed" : "task";
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = task.completed ? "Mark active" : "Mark complete";
    toggle.setAttribute("aria-label", `${toggle.textContent}: ${task.title}`);
    toggle.addEventListener("click", () => {
      task.completed = !task.completed;
      render();
    });
    item.append(title, toggle);
    list.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) {
    formStatus.textContent = "Enter a task name.";
    input.focus();
    return;
  }
  tasks.push({ id: nextId++, title, completed: false });
  input.value = "";
  formStatus.textContent = `Added: ${title}`;
  render();
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    for (const filterButton of filterButtons) {
      filterButton.setAttribute("aria-pressed", String(filterButton === button));
    }
    render();
  });
}

render();
