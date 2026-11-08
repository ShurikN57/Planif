// Minimal lint rules (audit COD-3): undeclared names, unused code and loose equality.
const globals=require('globals');
const planifGlobals=Object.fromEntries(['PlanifBackup','PlanifCoros','PlanifCorosAdapter','PlanifEngine','PlanifEvidence','PlanifHtml','PlanifRules','PlanifStrava','PlanifStravaContext','PlanifVersion','PlanifCalendarDrag','firebase'].map(name=>[name,'readonly']));
const rules={
  'no-undef':'error',
  'no-unused-vars':['error',{args:'none',caughtErrors:'none',varsIgnorePattern:'^_'}],
  eqeqeq:['error','smart']
};
module.exports=[
  {ignores:['node_modules/**']},
  {
    files:['planif-*.js'],
    languageOptions:{ecmaVersion:2022,sourceType:'script',globals:{...globals.browser,...planifGlobals,module:'readonly',require:'readonly'}},
    // Top-level names of browser scripts are shared globals between files: only locals are checked.
    rules:{...rules,'no-unused-vars':['error',{...rules['no-unused-vars'][1],vars:'local'}]}
  },
  {files:['sw.js'],languageOptions:{ecmaVersion:2022,sourceType:'script',globals:globals.serviceworker},rules},
  {files:['**/*.cjs'],languageOptions:{ecmaVersion:2022,sourceType:'commonjs',globals:globals.node},rules}
];
