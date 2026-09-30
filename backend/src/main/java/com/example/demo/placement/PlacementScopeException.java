package com.example.demo.placement;

/**
 * P7 (R9): a company tried to act on a placement outside its own company
 * scope. Message is deliberately generic.
 */
public class PlacementScopeException extends RuntimeException {

    public PlacementScopeException() {
        super("You can only manage your own company's offers.");
    }
}
