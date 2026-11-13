# Architecture rules

- Keep the staff quality-of-life domain definitions, questionnaire items, and result calculations together in the dedicated staff questionnaire data module so the form and PDF use the same domain mapping.
- Keep student-focused QoL content in its own data module and reuse the questionnaire view and scoring engine so self-report and observer wording remain separate without diverging UI/PDF calculations.
- Public observer QoL forms accept a freely entered student name and keep answers in memory only; never load a student roster on these public links to avoid disclosing student identities.
- Parent coach chat data is reachable only through the parent-coach edge function (tables have RLS with no client policies); name-only entry issues a unique participant token and must never look up another participant's history by name.
- Validate parent coach entry with the function-local login-input module so code-free entry and required names can be tested without exposing chat data.
