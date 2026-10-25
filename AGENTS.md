# Architecture rules

- Keep the staff quality-of-life domain definitions, questionnaire items, and result calculations together in the dedicated staff questionnaire data module so the form and PDF use the same domain mapping.
- Keep student-focused QoL content in its own data module and reuse the questionnaire view and scoring engine so self-report and observer wording remain separate without diverging UI/PDF calculations.
- Public observer QoL forms accept a freely entered student name and keep answers in memory only; never load a student roster on these public links to avoid disclosing student identities.