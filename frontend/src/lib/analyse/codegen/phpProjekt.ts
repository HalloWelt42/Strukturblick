// Miniprojekt PHP: Composer-Projekt mit PSR-4 (je Klasse eine Datei unter src/), den Daten unter daten/ und lesen.php.
// Es läuft auch ohne Composer: lesen.php bringt dann einen kleinen Autoloader mit; Attribute lädt PHP erst beim Prüfen,
// das nur mit symfony/validator geschieht (sonst ein Hinweis).

import { klassenIn, type Klassenmodell } from "./modell";
import { phpDateien, phpVoraussetzung, phpWurzel } from "./php";
import type { Codedatei, Codeoptionen, Miniprojektdaten } from "./ziele";

const paket = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "daten";

export function phpMiniprojekt(m: Klassenmodell, o: Codeoptionen, daten: Miniprojektdaten): Codedatei[] {
  const ns = o.namensraum.replace(/^\\+|\\+$/g, "");
  const klassen = phpDateien(m, { ...o, namensraum: ns }, true).map((d) => ({ name: `src/${d.name}`, text: d.text }));
  const composer = {
    name: `strukturblick/${paket(o.dateistamm)}`,
    description: `Klassen zu ${daten.name}`,
    type: "project",
    require: { php: o.unveraenderlich ? ">=8.2" : ">=8.1", ...(o.attribute ? { "symfony/validator": "^7.0" } : {}) },
    autoload: { "psr-4": { [ns ? `${ns}\\` : ""]: "src/" } },
  };
  const use = [...klassenIn(m.wurzel)].map((k) => `use ${ns ? `${ns}\\` : ""}${k};`);
  const lesen = [
    "<?php",
    "",
    "declare(strict_types=1);",
    "",
    ...(use.length ? [...use, ""] : []),
    `// Liest daten/${daten.name} in die Klassen unter src/ und zeigt eine Übersicht.`,
    "// Mit Composer (composer install) kommt der Autoloader aus vendor/, sonst der kleine hier.",
    "$composer = __DIR__ . '/vendor/autoload.php';",
    "if (is_file($composer)) {",
    "    require $composer;",
    "} else {",
    "    spl_autoload_register(static function (string $klasse): void {",
    ...(ns
      ? [`        $praefix = '${ns.replace(/\\/g, "\\\\")}\\\\';`, "        if (!str_starts_with($klasse, $praefix)) {", "            return;", "        }", "        $datei = __DIR__ . '/src/' . substr($klasse, strlen($praefix)) . '.php';"]
      : ["        if (str_contains($klasse, '\\\\')) {", "            return;", "        }", "        $datei = __DIR__ . '/src/' . $klasse . '.php';"]),
    "        if (is_file($datei)) {",
    "            require_once $datei;",
    "        }",
    "    });",
    "}",
    "",
    `$daten = json_decode((string) file_get_contents(__DIR__ . '/daten/${daten.name}'), true, flags: JSON_THROW_ON_ERROR);`,
    `$wurzel = ${phpWurzel(m, "$daten")};`,
    "",
    "echo 'Gelesen: ', is_object($wurzel) ? $wurzel::class : count($wurzel) . ' Einträge', PHP_EOL;",
    "foreach (array_slice(is_object($wurzel) ? get_object_vars($wurzel) : $wurzel, 0, 20, true) as $name => $wert) {",
    "    echo '  ', $name, ': ', match (true) {",
    "        is_array($wert) => count($wert) . ' Einträge',",
    "        is_object($wert) => $wert::class,",
    "        default => var_export($wert, true),",
    "    }, PHP_EOL;",
    "}",
    ...(o.attribute
      ? [
          "",
          "// Grenzen prüfen: nur mit symfony/validator (composer install)",
          "if (class_exists(\\Symfony\\Component\\Validator\\Validation::class)) {",
          "    $pruefer = \\Symfony\\Component\\Validator\\Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator();",
          "    $fehler = $pruefer->validate($wurzel, new \\Symfony\\Component\\Validator\\Constraints\\Valid());",
          "    echo count($fehler) === 0 ? 'Prüfung: alles passt' : 'Prüfung: ' . count($fehler) . ' Verstöße', PHP_EOL;",
          "    foreach (array_slice(iterator_to_array($fehler), 0, 20) as $f) {",
          "        echo '  ', $f->getPropertyPath(), ': ', $f->getMessage(), PHP_EOL;",
          "    }",
          "} else {",
          "    echo 'Prüfung übersprungen: composer install lädt symfony/validator.', PHP_EOL;",
          "}",
        ]
      : []),
    "",
  ].join("\n");
  const readme = [
    `# ${o.wurzelname}: Klassen zu ${daten.name}`,
    "",
    `${o.kopf}. Braucht ${phpVoraussetzung(o)}.`,
    "",
    "## Ausprobieren",
    "",
    "    php lesen.php",
    "",
    `Liest daten/${daten.name} in die Klassen unter src/ und zeigt eine Übersicht. Das geht ohne weitere Installation.`,
    "",
    o.attribute ? "## Mit Composer: Autoloader und Prüfung der Grenzen" : "## Mit Composer",
    "",
    "    composer install",
    "    php lesen.php",
    "",
    "Ohne eigenes Composer, mit Docker:",
    "",
    '    docker run --rm -v "$PWD":/app -w /app composer install',
    "",
  ].join("\n");
  return [
    ...klassen,
    { name: "composer.json", text: `${JSON.stringify(composer, null, 4)}\n` },
    { name: "lesen.php", text: lesen },
    { name: `daten/${daten.name}`, text: daten.text },
    { name: "README.md", text: readme },
  ];
}
