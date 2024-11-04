#include <emscripten/bind.h>
#include <string>

class SLICProcessor {
public:
    std::string sayHello() {
        return "Hey Slick!";
    }
};

using namespace emscripten;

EMSCRIPTEN_BINDINGS(slic_module) {
    class_<SLICProcessor>("SLICProcessor")
        .constructor<>()
        .function("sayHello", &SLICProcessor::sayHello);
}