package com.example.demo.evaluation;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/evaluations")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final com.example.demo.auth.UserRepository userRepository;

    public EvaluationController(EvaluationService evaluationService,
            com.example.demo.auth.UserRepository userRepository) {
        this.evaluationService = evaluationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Evaluation> getEvaluations() {
        return evaluationService.findAll();
    }

    @GetMapping("/student/{studentId}")
    public List<Evaluation> getEvaluationsByStudent(@PathVariable Long studentId) {
        return evaluationService.findByStudentId(studentId);
    }

    @PostMapping
    public ResponseEntity<Evaluation> createEvaluation(@RequestBody Evaluation evaluation) {
        // M5 bridge: derive the typed supervisor user id from the legacy string.
        if (evaluation.getSupervisorUserId() == null && evaluation.getSupervisorUsername() != null) {
            userRepository.findByUsername(evaluation.getSupervisorUsername())
                    .or(() -> userRepository.findByEmail(evaluation.getSupervisorUsername()))
                    .ifPresent(user -> evaluation.setSupervisorUserId(user.getId()));
        }
        Evaluation saved = evaluationService.create(evaluation);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Evaluation> updateEvaluation(@PathVariable Long id, @RequestBody Evaluation evaluation) {
        Evaluation updated = evaluationService.update(id, evaluation);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvaluation(@PathVariable Long id) {
        evaluationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
