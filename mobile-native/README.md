개인적인 경험상 잘 만든 모바일 애플리케이션은 동일하거나 유사한 컴포넌트를 재사용하는 구조를 보입니다.

그래서 이번에 구축할 RN 프로젝트는 Atomic Design 으로 아키텍처 패턴을 가져가려고 합니다.

아토믹 디자인에서는 컴포넌트를 atom, molecule, organism, template, page의 5가지 레벨로 나눕니다.

atom (원자)
더 이상 분해할 수 없는 기본 컴포넌트입니다.

label, input, button

molecule (분자)
여러 개의 atom을 결합하여 자신의 고유한 특성을 가집니다.

- search form (결합: label, input, button)

organism (유기체)
앞 단계보다 좀 더 복잡하고 서비스에서 표현될 수 있는 명확한 영역과 특정 컨텍스트를 가집니다.

- header, footer (결합: 여러개의 molecule)

template

실제 컴포넌트를 레이아웃에 배치하고 구조를 잡는 와이어 프레임입니다. 즉, 실제 콘텐츠가 없는 page 수준의 스켈레톤이라고 정의할 수 있습니다.
(결합: molecule / organism)

Page

template의 인스턴스라고 할 수 있습니다. 실제 데이터를 여기서 포함시킵니다.
(결합: template / 비즈니스 로직)
