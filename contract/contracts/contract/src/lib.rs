#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol, Vec, Map, Address};

#[contracttype]
#[derive(Clone)]
pub struct Quiz {
    pub question: Symbol,
    pub correct_answer: Symbol,
}

#[contracttype]
#[derive(Clone)]
pub struct UserScore {
    pub score: u32,
}

#[contract]
pub struct QuizContract;

#[contractimpl]
impl QuizContract {

    // Store quizzes
    pub fn create_quiz(env: Env, id: u32, question: Symbol, answer: Symbol) {
        let quiz = Quiz {
            question,
            correct_answer: answer,
        };
        env.storage().instance().set(&id, &quiz);
    }

    // Submit answer
    pub fn submit_answer(env: Env, user: Address, id: u32, answer: Symbol) {
        let quiz: Quiz = env.storage().instance().get(&id).unwrap();

        let mut score: u32 = 0;

        if quiz.correct_answer == answer {
            score = 1;
        }

        let user_score = UserScore { score };

        let key = (user, id);
        env.storage().instance().set(&key, &user_score);
    }

    // Get score
    pub fn get_score(env: Env, user: Address, id: u32) -> u32 {
        let key = (user, id);
        let result: UserScore = env.storage().instance().get(&key).unwrap();
        result.score
    }
}