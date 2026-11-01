"use strict";

(function () {
  const catalogs = {
    JavaScript: [
      ["Task board", "Task", "tasks", "organize daily work"],
      ["Library catalog", "Book", "books", "track borrowed books"],
      ["Expense tracker", "Expense", "expenses", "review spending"],
      ["Weather journal", "Forecast", "forecasts", "record local weather"],
      ["Recipe box", "Recipe", "recipes", "save cooking ideas"],
      ["Fitness log", "Workout", "workouts", "track exercise sessions"],
      ["Study planner", "Lesson", "lessons", "plan learning sessions"],
      ["Garden journal", "Plant", "plants", "care for a home garden"],
      ["Travel planner", "Trip", "trips", "organize upcoming travel"],
      ["Support queue", "Ticket", "tickets", "follow customer requests"]
    ],
    TypeScript: [
      ["Inventory manager", "Product", "products", "monitor available stock"],
      ["Appointment book", "Appointment", "appointments", "schedule client visits"],
      ["Reading list", "Article", "articles", "organize saved reading"],
      ["Music playlist", "Track", "tracks", "manage a music collection"],
      ["Volunteer roster", "Volunteer", "volunteers", "coordinate community help"],
      ["Class register", "Learner", "learners", "maintain a class roster"],
      ["Bug tracker", "Issue", "issues", "prioritize software issues"],
      ["Event calendar", "Event", "events", "plan community events"],
      ["Pet care log", "Pet", "pets", "remember animal care tasks"],
      ["Project dashboard", "Project", "projects", "review team milestones"]
    ],
    Python: [
      ["Contact manager", "Contact", "contacts", "keep personal contacts"],
      ["Habit tracker", "Habit", "habits", "build repeatable routines"],
      ["Invoice ledger", "Invoice", "invoices", "review issued invoices"],
      ["Movie collection", "Movie", "movies", "organize favorite films"],
      ["Language flashcards", "Card", "cards", "practice vocabulary recall"],
      ["Meal planner", "Meal", "meals", "organize weekly meals"],
      ["Job application log", "Application", "applications", "track job applications"],
      ["Budget planner", "Budget", "budgets", "plan household budgets"],
      ["Research notes", "Note", "notes", "organize research notes"],
      ["Delivery tracker", "Delivery", "deliveries", "follow parcel deliveries"]
    ],
    Java: [
      ["Bank account ledger", "Account", "accounts", "review account balances"],
      ["Cinema booking", "Booking", "bookings", "manage cinema reservations"],
      ["Course registry", "Course", "courses", "organize course enrollment"],
      ["Maintenance log", "Repair", "repairs", "track equipment repairs"],
      ["Team directory", "Member", "members", "organize team contacts"],
      ["Sales report", "Sale", "sales", "summarize daily sales"],
      ["Equipment checkout", "Equipment", "equipment", "track shared equipment"],
      ["Transit pass manager", "Pass", "passes", "manage transit passes"],
      ["News bookmarker", "Story", "stories", "save news for later"],
      ["Meeting minutes", "Meeting", "meetings", "record meeting follow-ups"]
    ],
    "C#": [
      ["Help desk queue", "Request", "requests", "resolve support requests"],
      ["Warehouse picker", "Order", "orders", "prepare warehouse orders"],
      ["Subscription manager", "Subscription", "subscriptions", "review active subscriptions"],
      ["Recipe nutrition log", "Ingredient", "ingredients", "organize recipe ingredients"],
      ["Training schedule", "Session", "sessions", "plan staff training"],
      ["Rental inventory", "Rental", "rentals", "manage item rentals"],
      ["Clinic check-in", "Patient", "patients", "organize clinic check-ins"],
      ["Donation register", "Donation", "donations", "record community donations"],
      ["Task reminder service", "Reminder", "reminders", "schedule useful reminders"],
      ["Asset register", "Asset", "assets", "track company equipment"]
    ],
    "C++": [
      ["Search index", "Document", "documents", "index searchable documents"],
      ["Score keeper", "Player", "players", "record match scores"],
      ["Queue simulator", "Job", "jobs", "process queued work"],
      ["Point-of-sale basket", "Item", "items", "calculate a shopping basket"],
      ["Sensor monitor", "Reading", "readings", "review sensor readings"],
      ["Tournament bracket", "Team", "teams", "organize a tournament"],
      ["Route planner", "Route", "routes", "compare travel routes"],
      ["File organizer", "FileEntry", "files", "sort a document collection"],
      ["Cafeteria menu", "Dish", "dishes", "manage a daily menu"],
      ["Parking register", "Vehicle", "vehicles", "track parking spaces"]
    ],
    Go: [
      ["URL shortener", "Link", "links", "manage short web links"],
      ["Log analyzer", "LogEntry", "entries", "summarize application logs"],
      ["Message dispatcher", "Message", "messages", "route service messages"],
      ["Cache monitor", "CacheItem", "items", "inspect cache entries"],
      ["Service health board", "Service", "services", "monitor service health"],
      ["Build queue", "Build", "builds", "coordinate software builds"],
      ["Metrics collector", "Metric", "metrics", "collect service metrics"],
      ["Backup catalog", "Backup", "backups", "catalog backup snapshots"],
      ["API request journal", "Request", "requests", "review API activity"],
      ["Deployment planner", "Release", "releases", "track service releases"]
    ]
  };

  const commentPrefix = {
    JavaScript: "//",
    TypeScript: "//",
    Python: "#",
    Java: "//",
    "C#": "//",
    "C++": "//",
    Go: "//"
  };

  function safeIdentifier(value) {
    return value.replace(/[^A-Za-z0-9]/g, "");
  }

  function makeSource(language, recipe, number) {
    const [title, entity, collection, purpose] = recipe;
    const id = safeIdentifier(entity);
    const list = safeIdentifier(collection);
    let lines;

    if (language === "JavaScript") {
      lines = [
        '"use strict";',
        `// ${title}: ${purpose}.`,
        `class ${id} {`,
        "  constructor(id, name, active = true) {",
        "    this.id = id;",
        "    this.name = name;",
        "    this.active = active;",
        "  }",
        "  describe() {",
        `    return \`\${this.id}: \${this.name} (${title.toLowerCase()})\`;`,
        "  }",
        "}",
        `function summarize${list}(${list}) {`,
        `  const active = ${list}.filter(item => item.active);`,
        "  return { count: active.length, names: active.map(item => item.name) };",
        "}",
        `const ${list} = [`,
        `  new ${id}(1, "${title} example one"),`,
        `  new ${id}(2, "${title} example two", false),`,
        `  new ${id}(3, "${title} example three")`,
        "];",
        `console.log(summarize${list}(${list}));`
      ];
    } else if (language === "TypeScript") {
      lines = [
        `interface ${id}Record {`,
        "  id: number;",
        "  name: string;",
        "  active: boolean;",
        "}",
        `function describe${id}(record: ${id}Record): string {`,
        `  return \`\${record.id}: \${record.name} (${title.toLowerCase()})\`;`,
        "}",
        `function summarize${list}(records: ${id}Record[]): string[] {`,
        "  return records.filter(record => record.active).map(describe" + id + ");",
        "}",
        `const ${list}: ${id}Record[] = [`,
        `  { id: 1, name: "${title} example one", active: true },`,
        `  { id: 2, name: "${title} example two", active: false },`,
        `  { id: 3, name: "${title} example three", active: true }`,
        "];",
        `console.log(summarize${list}(${list}));`
      ];
    } else if (language === "Python") {
      lines = [
        "from dataclasses import dataclass",
        "",
        `@dataclass`,
        `class ${id}:`,
        "    identifier: int",
        "    name: str",
        "    active: bool = True",
        "",
        `def summarize_${list}(${list}: list[${id}]) -> list[str]:`,
        `    return [f"{item.identifier}: {item.name} (${title.toLowerCase()})"`,
        `            for item in ${list} if item.active]`,
        "",
        `if __name__ == "__main__":`,
        `    ${list} = [`,
        `        ${id}(1, "${title} example one"),`,
        `        ${id}(2, "${title} example two", False),`,
        `        ${id}(3, "${title} example three"),`,
        "    ]",
        `    print(summarize_${list}(${list}))`
      ];
    } else if (language === "Java") {
      lines = [
        "import java.util.ArrayList;",
        "import java.util.List;",
        "",
        `public class ${id}Program${number} {`,
        "  static class Record {",
        "    final int id;",
        "    final String name;",
        "    final boolean active;",
        "    Record(int id, String name, boolean active) {",
        "      this.id = id;",
        "      this.name = name;",
        "      this.active = active;",
        "    }",
        "  }",
        "  public static void main(String[] args) {",
        "    List<Record> records = new ArrayList<>();",
        `    records.add(new Record(1, "${title} example one", true));`,
        `    records.add(new Record(2, "${title} example two", false));`,
        `    records.add(new Record(3, "${title} example three", true));`,
        "    for (Record record : records) {",
        `      if (record.active) System.out.println(record.id + ": " + record.name + " (${title.toLowerCase()})");`,
        "    }",
        "  }",
        "}"
      ];
    } else if (language === "C#") {
      lines = [
        "using System;",
        "using System.Collections.Generic;",
        "using System.Linq;",
        "",
        `public record ${id}Record(int Id, string Name, bool Active = true);`,
        `public static class ${id}Program${number}`,
        "{",
        "    public static void Main()",
        "    {",
        `        var ${list} = new List<${id}Record>`,
        "        {",
        `            new(1, "${title} example one"),`,
        `            new(2, "${title} example two", false),`,
        `            new(3, "${title} example three")`,
        "        };",
        `        foreach (var item in ${list}.Where(item => item.Active))`,
        `            Console.WriteLine($"{item.Id}: {item.Name} (${title.toLowerCase()})");`,
        "    }",
        "}"
      ];
    } else if (language === "C++") {
      lines = [
        "#include <iostream>",
        "#include <string>",
        "#include <vector>",
        "",
        `struct ${id}Record {`,
        "    int id;",
        "    std::string name;",
        "    bool active;",
        "};",
        `int main() {`,
        `    std::vector<${id}Record> ${list} = {`,
        `        {1, "${title} example one", true},`,
        `        {2, "${title} example two", false},`,
        `        {3, "${title} example three", true}`,
        "    };",
        `    for (const auto& item : ${list}) {`,
        "        if (item.active) {",
        `            std::cout << item.id << ": " << item.name << " (${title.toLowerCase()})" << '\\n';`,
        "        }",
        "    }",
        "    return 0;",
        "}"
      ];
    } else {
      lines = [
        "package main",
        "",
        'import "fmt"',
        "",
        `type ${id}Record struct {`,
        "    ID int",
        "    Name string",
        "    Active bool",
        "}",
        "",
        `func summarize${list}(records []${id}Record) {`,
        "    for _, record := range records {",
        "        if record.Active {",
        `            fmt.Printf("%d: %s (${title.toLowerCase()})\\n", record.ID, record.Name)`,
        "        }",
        "    }",
        "}",
        "",
        "func main() {",
        `    ${list} := []${id}Record{`,
        `        {ID: 1, Name: "${title} example one", Active: true},`,
        `        {ID: 2, Name: "${title} example two", Active: false},`,
        `        {ID: 3, Name: "${title} example three", Active: true},`,
        "    }",
        `    summarize${list}(${list})`,
        "}"
      ];
    }

    const prefix = commentPrefix[language];
    const padding = [];
    for (let lineNumber = 1; lineNumber <= 500; lineNumber++) {
      padding.push(`${prefix} ${title} practice note ${String(lineNumber).padStart(3, "0")}: ${purpose}; line ${lineNumber} of 500.`);
    }
    const sourceLines = lines.concat(padding).slice(0, 500);
    return {
      id: `${language.toLowerCase().replace(/[^a-z]/g, "")}-${String(number).padStart(2, "0")}`,
      language,
      title,
      purpose,
      lines: sourceLines
    };
  }

  const programs = [];
  Object.entries(catalogs).forEach(([language, recipes]) => {
    recipes.forEach((recipe, index) => programs.push(makeSource(language, recipe, index + 1)));
  });

  window.DixarsDeveloperPrograms = {
    languages: Object.keys(catalogs),
    programs
  };
})();
